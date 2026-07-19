"use strict";
// Behavior-freeze split from delivery-report-part-01.ts (part 1/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINAL_SUMMARY_PROTOCOL_LEAK_PATTERN = exports.INTERNAL_DELIVERY_TEXT_PATTERN = void 0;
exports.sanitizeMainAgentDeliveryText = sanitizeMainAgentDeliveryText;
exports.uniqueDeliveryStrings = uniqueDeliveryStrings;
exports.uniqueDeliveryLines = uniqueDeliveryLines;
exports.asArray = asArray;
exports.firstObject = firstObject;
exports.firstBoolean = firstBoolean;
exports.formatDeliveryFileItem = formatDeliveryFileItem;
exports.normalizeDeliveryStatus = normalizeDeliveryStatus;
exports.hasBlockingDeliveryCompletionGap = hasBlockingDeliveryCompletionGap;
exports.deliveryStatusLabel = deliveryStatusLabel;
exports.deliveryTitle = deliveryTitle;
exports.getNestedReport = getNestedReport;
exports.collectDeliveryFiles = collectDeliveryFiles;
exports.collectDeliveryVerification = collectDeliveryVerification;
exports.deliveryVerificationFailureText = deliveryVerificationFailureText;
exports.deliveryVerificationSuccessText = deliveryVerificationSuccessText;
exports.collectFailedDeliveryVerificationEvidence = collectFailedDeliveryVerificationEvidence;
exports.collectIncompleteDeliveryVerificationEvidence = collectIncompleteDeliveryVerificationEvidence;
exports.collectWeakMissingDeliveryVerificationEvidence = collectWeakMissingDeliveryVerificationEvidence;
exports.collectDeliveryVerificationEvidence = collectDeliveryVerificationEvidence;
exports.collectRawDeliveryIndependentReviewEvidence = collectRawDeliveryIndependentReviewEvidence;
exports.collectFailedIndependentReviewEvidence = collectFailedIndependentReviewEvidence;
exports.collectIncompleteIndependentReviewEvidence = collectIncompleteIndependentReviewEvidence;
exports.collectWeakPassedIndependentReviewEvidence = collectWeakPassedIndependentReviewEvidence;
exports.formatDeliveryIndependentReviewEvidence = formatDeliveryIndependentReviewEvidence;
// Behavior-freeze split from delivery-report.ts (part 1/2).
const user_facing_text_1 = require("./user-facing-text");
exports.INTERNAL_DELIVERY_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease|workchain/i;
exports.FINAL_SUMMARY_PROTOCOL_LEAK_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease/i;
function compactDeliveryText(value, max = 260) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}...`;
}
function sanitizeDeliveryUserTerminology(value) {
    return (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)((0, user_facing_text_1.sanitizeUserFacingProtocolTerms)((0, user_facing_text_1.sanitizeUserFacingTerminology)(value)));
}
function sanitizeMainAgentDeliveryText(value, fallback = "处理结果已整理，是否可验收以验证详情为准。", max = 260) {
    let text = compactDeliveryText(value, max);
    if (!text)
        text = fallback;
    if (exports.INTERNAL_DELIVERY_TEXT_PATTERN.test(text)) {
        if (/error|失败|denied|invalid|权限|门禁/i.test(text))
            text = "执行过程中遇到待排查的问题，我会继续定位；排障信息已放入技术详情。";
        else if (/done|完成|receipt|回执/i.test(text))
            text = "执行成员已提交结果说明，我已完成汇总。";
        else
            text = fallback;
    }
    return compactDeliveryText(sanitizeDeliveryUserTerminology(text
        .replace(/\bCoordinator\b/g, "我")
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
function flattenDeliveryLineValues(value) {
    if (Array.isArray(value))
        return value.flatMap(flattenDeliveryLineValues);
    if (value === undefined || value === null)
        return [];
    if (value && typeof value === "object")
        return [formatDeliveryObject(value)].filter(Boolean);
    const text = String(value || "").trim();
    if (!text || ["无", "暂无", "未提供", "未填写", "null", "undefined"].includes(text))
        return [];
    return [text];
}
function uniqueDeliveryLines(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const raw of flattenDeliveryLineValues(list)) {
            const value = sanitizeMainAgentDeliveryText(raw, "", 520);
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
function hasBlockingDeliveryCompletionGap(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const gate = firstObject(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, completion.independent_review_gate, completion.independentReviewGate, workchainSummary.independent_review_gate, workchainSummary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    const independentReviewRequired = firstBoolean(report.independent_review_required, report.independentReviewRequired, summary.independent_review_required, summary.independentReviewRequired, completion.independent_review_required, completion.independentReviewRequired, workchainSummary.independent_review_required, workchainSummary.independentReviewRequired, task.delivery_summary?.independent_review_required, task.delivery_summary?.independentReviewRequired, task.requires_independent_review, task.requiresIndependentReview, gate?.required);
    const independentReviewPassed = firstBoolean(report.independent_review_gate_passed, report.independentReviewGatePassed, summary.independent_review_gate_passed, summary.independentReviewGatePassed, completion.independent_review_gate_passed, completion.independentReviewGatePassed, workchainSummary.independent_review_gate_passed, workchainSummary.independentReviewGatePassed, task.delivery_summary?.independent_review_gate_passed, task.delivery_summary?.independentReviewGatePassed, gate?.pass, gate?.passed);
    const postReviewSpotCheckGate = firstObject(report.post_review_spot_check_gate, report.postReviewSpotCheckGate, summary.post_review_spot_check_gate, summary.postReviewSpotCheckGate, completion.post_review_spot_check_gate, completion.postReviewSpotCheckGate, workchainSummary.post_review_spot_check_gate, workchainSummary.postReviewSpotCheckGate, task.delivery_summary?.post_review_spot_check_gate, task.delivery_summary?.postReviewSpotCheckGate);
    const postReviewSpotCheckRequired = firstBoolean(report.post_review_spot_check_required, report.postReviewSpotCheckRequired, summary.post_review_spot_check_required, summary.postReviewSpotCheckRequired, completion.post_review_spot_check_required, completion.postReviewSpotCheckRequired, workchainSummary.post_review_spot_check_required, workchainSummary.postReviewSpotCheckRequired, task.delivery_summary?.post_review_spot_check_required, task.delivery_summary?.postReviewSpotCheckRequired, postReviewSpotCheckGate?.required);
    const postReviewSpotCheckPassed = firstBoolean(report.post_review_spot_check_gate_passed, report.postReviewSpotCheckGatePassed, summary.post_review_spot_check_gate_passed, summary.postReviewSpotCheckGatePassed, completion.post_review_spot_check_gate_passed, completion.postReviewSpotCheckGatePassed, workchainSummary.post_review_spot_check_gate_passed, workchainSummary.postReviewSpotCheckGatePassed, task.delivery_summary?.post_review_spot_check_gate_passed, task.delivery_summary?.postReviewSpotCheckGatePassed, postReviewSpotCheckGate?.pass);
    const gateStatus = String(gate?.status || "").toLowerCase();
    const acceptancePassed = firstBoolean(report.acceptance_gate_passed, report.acceptance_passed, summary.acceptance_gate_passed, summary.acceptance_passed, completion.acceptance_gate_passed, completion.acceptance_passed, workchainSummary.acceptance_gate_passed, workchainSummary.acceptance_passed, task.delivery_summary?.acceptance_gate_passed, task.delivery_summary?.acceptance_passed);
    const verificationRequiredPassed = firstBoolean(report.verification_required_gate_passed, summary.verification_required_gate_passed, completion.verification_required_gate_passed, workchainSummary.verification_required_gate_passed);
    const verificationSourcePassed = firstBoolean(report.verification_source_gate_passed, summary.verification_source_gate_passed, completion.verification_source_gate_passed, workchainSummary.verification_source_gate_passed);
    const failedVerification = uniqueDeliveryStrings(report.verification_failed, report.failed_verification, summary.verification_failed, summary.failed_verification, completion.verification_failed, workchainSummary.verification_failed);
    const failedVerificationEvidence = collectFailedDeliveryVerificationEvidence(input);
    const incompleteVerificationEvidence = collectIncompleteDeliveryVerificationEvidence(input);
    const weakVerificationEvidence = collectWeakMissingDeliveryVerificationEvidence(input);
    const missingVerification = uniqueDeliveryStrings(asArray(report.verification_required_missing).map(formatDeliveryMissingVerification), asArray(summary.verification_required_missing).map(formatDeliveryMissingVerification), asArray(completion.verification_required_missing).map(formatDeliveryMissingVerification), asArray(workchainSummary.verification_required_missing).map(formatDeliveryMissingVerification));
    const planStatus = String(report.plan_alignment?.status
        || report.planAlignment?.status
        || summary.plan_alignment?.status
        || summary.planAlignment?.status
        || completion.plan_alignment?.status
        || completion.planAlignment?.status
        || workchainSummary.plan_alignment?.status
        || workchainSummary.planAlignment?.status
        || "").toLowerCase();
    const failedIndependentReviewEvidence = collectFailedIndependentReviewEvidence(input);
    const weakPassedIndependentReviewEvidence = collectWeakPassedIndependentReviewEvidence(input);
    return acceptancePassed === false
        || verificationRequiredPassed === false
        || verificationSourcePassed === false
        || failedVerification.length > 0
        || failedVerificationEvidence.length > 0
        || incompleteVerificationEvidence.length > 0
        || weakVerificationEvidence.length > 0
        || missingVerification.length > 0
        || failedIndependentReviewEvidence.length > 0
        || collectIncompleteIndependentReviewEvidence(input).length > 0
        || weakPassedIndependentReviewEvidence.length > 0
        || (independentReviewRequired === true && independentReviewPassed !== true)
        || (postReviewSpotCheckRequired === true && postReviewSpotCheckPassed !== true)
        || /failed|rejected|blocked/i.test(gateStatus)
        || ["deviated", "needs_evidence", "failed"].includes(planStatus);
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
    const agent = sanitizeMainAgentDeliveryText(item.agent || item.project || item.target || "未识别执行成员", "未识别执行成员", 80);
    const required = uniqueDeliveryStrings(item.required, item.commands, item.command, item.expected).slice(0, 3);
    const reason = sanitizeMainAgentDeliveryText(item.reason || item.detail || "", "", 160);
    return sanitizeMainAgentDeliveryText(`${agent}：${required.length ? required.join(" / ") : "未提供项目验证命令执行证据"}${reason ? `（${reason}）` : ""}`, "", 320);
}
function collectRawDeliveryVerificationEvidence(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const run = input.run || {};
    return asArray([
        report.verification_results,
        report.verificationResults,
        report.verification,
        report.checks,
        report.delivery?.verification,
        report.delivery?.verification_results,
        summary.verification_results,
        summary.verificationResults,
        summary.verification,
        summary.checks,
        summary.delivery?.verification,
        summary.delivery?.verification_results,
        task.receipt?.verification,
        task.delivery_summary?.verification_results,
        task.delivery_summary?.verificationResults,
        task.delivery_summary?.verification,
        task.delivery_summary?.checks,
        completion.verification,
        completion.verification_results,
        completion.verificationResults,
        completion.evidence,
        run.verification,
        run.verification_results,
        run.checks,
        workchainSummary.verification,
        workchainSummary.verification_results,
        workchainSummary.verificationResults,
        workchainSummary.checks,
    ]).flatMap(asArray).filter(item => item !== undefined && item !== null && String(item).trim() !== "");
}
function deliveryVerificationFailureText(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    const lower = text.toLowerCase();
    if (/未通过|验证失败|测试失败|执行失败|命令失败|报错|错误/i.test(text))
        return true;
    if (/无失败|未发现.*失败|没有.*失败|0\s*项?失败/i.test(text))
        return false;
    if (/\b(failed|failure|error|errored|non[-_\s]?zero|exit code [1-9]\d*|exit_code [1-9]\d*|exitCode [1-9]\d*)\b/i.test(lower)
        && !/\b(no|not|without|zero|0)\s+(failed|failures|errors?)\b/i.test(lower))
        return true;
    if (/失败/i.test(text))
        return true;
    return false;
}
function deliveryVerificationSuccessText(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text)
        return false;
    return ["passed", "pass", "success", "succeeded", "ok", "done", "complete", "completed"].includes(text)
        || /通过|成功|无失败|未发现.*失败|没有.*失败|no failed|no failures|0 failed|0 failures|exit code 0|exit_code 0/i.test(text);
}
function deliveryVerificationIncompleteText(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    const lower = text.toLowerCase();
    if (/无法验证|未验证|未执行|未运行|跳过|仅部分|部分通过|部分完成|待验证|待补跑|待补齐|证据不足|无法确认|未覆盖|缺失验证|需要补跑|需补跑/i.test(text))
        return true;
    if (/\b(partial|incomplete|inconclusive|unable[_\s-]?to[_\s-]?verify|not[_\s-]?verified|not[_\s-]?run|not[_\s-]?executed|skipped|pending|todo)\b/i.test(lower))
        return true;
    return false;
}
function formatDeliveryVerificationFailureEvidence(item) {
    if (!item || typeof item !== "object")
        return sanitizeMainAgentDeliveryText(item, "验证失败", 320);
    const command = sanitizeMainAgentDeliveryText(item.command || item.cmd || item.name || item.label || item.title || "", "", 160);
    const status = sanitizeMainAgentDeliveryText(item.status || item.result || item.outcome || item.verdict || item.state || "", "", 80);
    const detail = sanitizeMainAgentDeliveryText(item.summary || item.message || item.error || item.stderr || item.detail || item.reason || "", "", 220);
    const exitCode = item.exitCode ?? item.exit_code ?? item.code;
    const exitText = exitCode !== undefined && exitCode !== null && exitCode !== "" ? `退出码 ${exitCode}` : "";
    return sanitizeMainAgentDeliveryText([command, status, exitText, detail].filter(Boolean).join(" - "), "验证失败", 360);
}
function formatDeliveryVerificationIncompleteEvidence(item) {
    if (!item || typeof item !== "object")
        return sanitizeMainAgentDeliveryText(item, "验证未完成", 320);
    const command = sanitizeMainAgentDeliveryText(item.command || item.cmd || item.name || item.label || item.title || "", "", 160);
    const status = sanitizeMainAgentDeliveryText(item.status || item.result || item.outcome || item.verdict || item.state || "", "", 80);
    const detail = sanitizeMainAgentDeliveryText(item.summary || item.message || item.detail || item.reason || item.note || "", "", 220);
    return sanitizeMainAgentDeliveryText([command, status, detail].filter(Boolean).join(" - "), "验证未完成", 360);
}
function deliveryVerificationFailureSummary(item) {
    if (!item)
        return "";
    if (typeof item !== "object") {
        return deliveryVerificationFailureText(item) ? sanitizeMainAgentDeliveryText(item, "验证失败", 320) : "";
    }
    const booleanVerdict = firstBoolean(item.ok, item.pass, item.passed, item.success, item.status, item.result, item.outcome, item.verdict, item.state);
    if (booleanVerdict === false)
        return formatDeliveryVerificationFailureEvidence(item);
    if (booleanVerdict === true)
        return "";
    const exitCode = item.exitCode ?? item.exit_code ?? item.code;
    if (exitCode !== undefined && exitCode !== null && exitCode !== "" && Number(exitCode) !== 0 && Number.isFinite(Number(exitCode))) {
        return formatDeliveryVerificationFailureEvidence(item);
    }
    const failedCount = firstDeliveryNumber(item.failed_count, item.failedCount, item.failures, item.errors, item.error_count, item.errorCount);
    if (failedCount !== null && failedCount > 0)
        return formatDeliveryVerificationFailureEvidence(item);
    const statusText = [item.status, item.result, item.outcome, item.verdict, item.state, item.conclusion].filter(Boolean).join(" ");
    if (statusText && deliveryVerificationSuccessText(statusText))
        return "";
    const detailText = [
        item.summary,
        item.message,
        item.error,
        item.stderr,
        item.stdout,
        item.detail,
        item.reason,
        item.output,
        item.logs,
    ].flatMap(asArray).map(value => typeof value === "object" ? formatDeliveryObject(value) : value).filter(Boolean).join(" ");
    return deliveryVerificationFailureText([statusText, detailText].filter(Boolean).join(" ")) ? formatDeliveryVerificationFailureEvidence(item) : "";
}
function deliveryVerificationIncompleteSummary(item) {
    if (!item)
        return "";
    if (typeof item !== "object") {
        return deliveryVerificationIncompleteText(item) && !deliveryVerificationFailureText(item)
            ? sanitizeMainAgentDeliveryText(item, "验证未完成", 320)
            : "";
    }
    if (deliveryVerificationFailureSummary(item))
        return "";
    const booleanVerdict = firstBoolean(item.ok, item.pass, item.passed, item.success, item.status, item.result, item.outcome, item.verdict, item.state);
    if (booleanVerdict === true)
        return "";
    const statusText = [item.status, item.result, item.outcome, item.verdict, item.state, item.conclusion].filter(Boolean).join(" ");
    if (statusText && deliveryVerificationSuccessText(statusText))
        return "";
    if (deliveryVerificationIncompleteText(statusText))
        return formatDeliveryVerificationIncompleteEvidence(item);
    const skipped = firstBoolean(item.skipped, item.skip, item.not_run, item.notRun, item.not_executed, item.notExecuted);
    if (skipped === true)
        return formatDeliveryVerificationIncompleteEvidence(item);
    const detailText = [
        item.summary,
        item.message,
        item.detail,
        item.reason,
        item.note,
        item.output,
        item.logs,
    ].flatMap(asArray).map(value => typeof value === "object" ? formatDeliveryObject(value) : value).filter(Boolean).join(" ");
    return deliveryVerificationIncompleteText(detailText) ? formatDeliveryVerificationIncompleteEvidence(item) : "";
}
function collectFailedDeliveryVerificationEvidence(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    return uniqueDeliveryLines(report.verification_failed, report.failed_verification, summary.verification_failed, summary.failed_verification, completion.verification_failed, workchainSummary.verification_failed, collectRawDeliveryVerificationEvidence(input).map(deliveryVerificationFailureSummary)).slice(0, 8);
}
function collectIncompleteDeliveryVerificationEvidence(input) {
    return uniqueDeliveryLines(collectRawDeliveryVerificationEvidence(input).map(deliveryVerificationIncompleteSummary)).slice(0, 8);
}
function collectWeakMissingDeliveryVerificationEvidence(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const files = collectDeliveryFiles(input);
    if (!files.length)
        return [];
    const executedExplicit = uniqueDeliveryStrings(report.verification_executed, report.executed_verification, summary.verification_executed, summary.executed_verification, completion.verification_executed, workchainSummary.verification_executed);
    const externalRunnerEvidence = uniqueDeliveryStrings(report.external_runner_verification, summary.external_runner_verification, completion.external_runner_verification, workchainSummary.external_runner_verification);
    const recordedResults = uniqueDeliveryStrings(collectRawDeliveryVerificationEvidence(input));
    const sourceGatePassed = firstBoolean(report.verification_source_gate_passed, summary.verification_source_gate_passed, completion.verification_source_gate_passed, workchainSummary.verification_source_gate_passed);
    const externalRunnerCount = firstDeliveryNumber(report.external_runner_verification_count, summary.external_runner_verification_count, completion.external_runner_verification_count, workchainSummary.external_runner_verification_count) ?? externalRunnerEvidence.length;
    const failed = collectFailedDeliveryVerificationEvidence(input);
    const incomplete = collectIncompleteDeliveryVerificationEvidence(input);
    const missingRequired = uniqueDeliveryStrings(asArray(report.verification_required_missing).map(formatDeliveryMissingVerification), asArray(summary.verification_required_missing).map(formatDeliveryMissingVerification), asArray(completion.verification_required_missing).map(formatDeliveryMissingVerification), asArray(workchainSummary.verification_required_missing).map(formatDeliveryMissingVerification));
    if (executedExplicit.length
        || externalRunnerEvidence.length
        || recordedResults.length
        || externalRunnerCount > 0
        || sourceGatePassed === true
        || failed.length
        || incomplete.length
        || missingRequired.length)
        return [];
    return [`已整理 ${files.length} 个文件变更，但没有系统捕获到实际验证证据。`];
}
function collectDeliveryVerificationEvidence(input, status) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const executedExplicit = uniqueDeliveryStrings(report.verification_executed, report.executed_verification, summary.verification_executed, summary.executed_verification, completion.verification_executed, workchainSummary.verification_executed);
    const externalRunnerEvidence = uniqueDeliveryStrings(report.external_runner_verification, summary.external_runner_verification, completion.external_runner_verification, workchainSummary.external_runner_verification);
    const recordedResults = uniqueDeliveryStrings(report.verification_results, summary.verification_results, report.verification, summary.verification, report.checks, summary.checks, report.delivery?.verification, task.receipt?.verification, completion.verification, completion.evidence, workchainSummary.verification);
    const executed = uniqueDeliveryStrings(executedExplicit, externalRunnerEvidence, executedExplicit.length || externalRunnerEvidence.length ? [] : recordedResults).slice(0, 12);
    const failed = collectFailedDeliveryVerificationEvidence(input);
    const incomplete = collectIncompleteDeliveryVerificationEvidence(input);
    const weakMissing = collectWeakMissingDeliveryVerificationEvidence(input);
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
    if (incomplete.length)
        items.push(`未完成验证 ${incomplete.length} 项：${incomplete.slice(0, 3).join("；")}`);
    if (weakMissing.length)
        items.push(`验证证据不足：${weakMissing.slice(0, 3).join("；")}`);
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
        items.push("外部 Runner 证据缺失：当前不能只凭执行成员自述判定完成。");
    if (!items.length) {
        items.push(status === "done"
            ? "暂无系统捕获的实际验证证据；建议核对技术详情里的执行记录后再最终确认。"
            : "验证证据仍在收集，完成后会在这里展示实际执行结果。");
    }
    const needsAttention = failed.length > 0
        || incomplete.length > 0
        || weakMissing.length > 0
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
        : incomplete.length
            ? `${incomplete.length} 项未完成`
            : weakMissing.length
                ? "证据不足"
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
        incomplete_count: incomplete.length,
        weak_missing_count: weakMissing.length,
        suggested_count: suggested.length,
        missing_required_count: missingRequired.length,
        external_runner_count: externalRunnerCount,
        required_gate_passed: requiredGatePassed,
        source_gate_passed: sourceGatePassed,
        executed,
        failed,
        incomplete,
        weak_missing: weakMissing,
        suggested,
        missing_required: missingRequired,
        items: uniqueDeliveryStrings(items).slice(0, 8),
        next_action: needsAttention
            ? "先补齐失败、未完成、缺失或仅建议的验证，再进行最终验收。"
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
    if (/无阻塞|无高风险|未发现.*(阻塞|风险)|没有.*(阻塞|风险)/.test(text))
        return "已通过";
    if (["failed", "fail", "rejected", "reject", "blocked", "block", "needs_rework", "changes_requested"].includes(text) || /未通过|失败|拒绝|阻塞|需要返工|需返工/.test(text))
        return "未通过";
    if (["passed", "pass", "approved", "approve", "success", "ok", "done", "complete", "completed"].includes(text) || /已通过|通过|批准|无阻塞|无高风险|未发现.*(阻塞|风险)|没有.*(阻塞|风险)/.test(text))
        return "已通过";
    if (/风险/.test(text))
        return "未通过";
    if (["partial", "incomplete", "inconclusive", "unable_to_verify", "unable-to-verify", "skipped"].includes(text) || /部分|无法验证|无法确认|未验证|未完成|跳过|证据不足/.test(text))
        return "待补齐";
    if (["missing", "pending", "waiting", "required"].includes(text) || /待|缺|等待/.test(text))
        return "待补齐";
    if (["not_required", "not-required", "none"].includes(text))
        return "未触发";
    return sanitizeMainAgentDeliveryText(value, "已记录", 80);
}
function collectRawDeliveryIndependentReviewEvidence(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const gate = firstObject(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, completion.independent_review_gate, completion.independentReviewGate, workchainSummary.independent_review_gate, workchainSummary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    return asArray([
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
        completion.independent_review,
        completion.independentReview,
        workchainSummary.independent_review_evidence,
        workchainSummary.independentReviewEvidence,
        workchainSummary.independent_review,
        workchainSummary.independentReview,
        task.delivery_summary?.independent_review_evidence,
        task.delivery_summary?.independentReviewEvidence,
        task.delivery_summary?.independent_review,
        task.delivery_summary?.independentReview,
        task.delivery_summary?.code_review,
        task.delivery_summary?.codeReview,
        gate?.evidence,
        gate?.findings,
    ]).flatMap(asArray).filter(item => item !== undefined && item !== null && String(item).trim() !== "");
}
function deliveryIndependentReviewFailureText(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    const lower = text.toLowerCase();
    const normalized = lower.replace(/\s+/g, " ").replace(/-/g, "_");
    if (/未通过|复核失败|审核失败|验证失败|拒绝|需要返工|需返工|要求返工|不能通过|未满足/i.test(text))
        return true;
    if (["failed", "fail", "rejected", "reject", "blocked", "block", "needs_rework", "need_rework", "changes_requested"].includes(normalized))
        return true;
    if (/\b(needs[_\s-]?rework|changes requested|rejected|blocked)\b/i.test(lower))
        return true;
    if (/未发现.*(阻塞|失败|风险)|没有.*(阻塞|失败|风险)|无阻塞|无高风险|no blocking|no blockers|no failed|without blocking/i.test(text))
        return false;
    if (/失败|阻塞/i.test(text))
        return true;
    if (/\bfailed?\b/i.test(lower) && !/\b(no|not|without|zero|0)\s+failed?\b/i.test(lower))
        return true;
    return false;
}
function deliveryIndependentReviewIncompleteText(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    if (deliveryIndependentReviewFailureText(text))
        return false;
    if (/部分|无法验证|无法确认|未验证|未完成|跳过|证据不足|待补齐|待确认/i.test(text))
        return true;
    if (/\b(partial|incomplete|inconclusive|unable[_\s-]?to[_\s-]?verify|not[_\s-]?verified|skipped|pending)\b/i.test(text))
        return true;
    return false;
}
function deliveryIndependentReviewFailureSummary(item) {
    if (!item)
        return "";
    if (typeof item !== "object") {
        return deliveryIndependentReviewFailureText(item) ? sanitizeMainAgentDeliveryText(item, "独立复核未通过", 260) : "";
    }
    const verdict = item.verdict
        || item.status
        || item.result
        || item.outcome
        || item.conclusion
        || item.decision
        || item.review_status
        || item.reviewStatus
        || item.gate_status
        || item.gateStatus
        || "";
    if (deliveryIndependentReviewLabel(verdict) === "未通过" || deliveryIndependentReviewFailureText(verdict)) {
        return formatDeliveryIndependentReviewEvidence(item);
    }
    const reviewText = [
        item.summary,
        item.note,
        item.comment,
        item.message,
        item.reason,
        item.detail,
        item.details,
        item.findings,
        item.blockers,
        item.needs,
    ].flatMap(asArray).map(value => typeof value === "object" ? formatDeliveryObject(value) : value).filter(Boolean).join(" ");
    return deliveryIndependentReviewFailureText(reviewText) ? formatDeliveryIndependentReviewEvidence(item) : "";
}
function collectFailedIndependentReviewEvidence(input) {
    return uniqueDeliveryLines(collectRawDeliveryIndependentReviewEvidence(input).map(deliveryIndependentReviewFailureSummary)).slice(0, 4);
}
function deliveryIndependentReviewIncompleteSummary(item) {
    if (!item)
        return "";
    if (typeof item !== "object") {
        return deliveryIndependentReviewIncompleteText(item) ? sanitizeMainAgentDeliveryText(item, "独立复核仍有无法确认的内容", 260) : "";
    }
    if (deliveryIndependentReviewFailureSummary(item))
        return "";
    const verdict = item.verdict
        || item.status
        || item.result
        || item.outcome
        || item.conclusion
        || item.decision
        || item.review_status
        || item.reviewStatus
        || item.gate_status
        || item.gateStatus
        || "";
    if (deliveryIndependentReviewLabel(verdict) === "已通过")
        return "";
    if (deliveryIndependentReviewIncompleteText(verdict))
        return formatDeliveryIndependentReviewEvidence(item);
    const reviewText = [
        item.summary,
        item.note,
        item.comment,
        item.message,
        item.reason,
        item.detail,
        item.details,
        item.findings,
        item.blockers,
        item.needs,
    ].flatMap(asArray).map(value => typeof value === "object" ? formatDeliveryObject(value) : value).filter(Boolean).join(" ");
    return deliveryIndependentReviewIncompleteText(reviewText) ? formatDeliveryIndependentReviewEvidence(item) : "";
}
function collectIncompleteIndependentReviewEvidence(input) {
    return uniqueDeliveryLines(collectRawDeliveryIndependentReviewEvidence(input).map(deliveryIndependentReviewIncompleteSummary)).slice(0, 4);
}
function independentReviewEvidenceHasSupport(item) {
    if (!item || typeof item !== "object")
        return false;
    const evidenceCount = firstDeliveryNumber(item.evidence_count, item.evidenceCount, item.command_count, item.commandCount, item.check_count, item.checkCount, item.file_count, item.fileCount);
    if (evidenceCount !== null && evidenceCount > 0)
        return true;
    const support = uniqueDeliveryStrings(item.evidence, item.checks, item.findings, item.filesReviewed, item.files_reviewed, item.files, item.commands, item.command, item.verification, item.verification_results, item.verificationResults, item.artifacts, item.screenshots, item.outputs, item.command_output, item.commandOutput);
    if (support.length > 0)
        return true;
    const summary = String(item.summary || item.note || item.comment || item.message || item.detail || "").trim();
    return /\b(npm|pnpm|yarn|vitest|jest|pytest|playwright|tsc|eslint|cargo|go test|mvn|gradle)\b|命令|截图|复核文件|测试输出|验证输出/i.test(summary);
}
function deliveryIndependentReviewWeakPassSummary(item) {
    if (!item)
        return "";
    if (typeof item !== "object") {
        const label = deliveryIndependentReviewLabel(item);
        return label === "已通过" ? sanitizeMainAgentDeliveryText(item, "独立复核通过证据不足", 260) : "";
    }
    if (deliveryIndependentReviewFailureSummary(item) || deliveryIndependentReviewIncompleteSummary(item))
        return "";
    const verdict = item.verdict
        || item.status
        || item.result
        || item.outcome
        || item.conclusion
        || item.decision
        || item.review_status
        || item.reviewStatus
        || item.gate_status
        || item.gateStatus
        || "";
    if (deliveryIndependentReviewLabel(verdict) !== "已通过")
        return "";
    return independentReviewEvidenceHasSupport(item) ? "" : formatDeliveryIndependentReviewEvidence(item);
}
function collectWeakPassedIndependentReviewEvidence(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const gate = firstObject(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, completion.independent_review_gate, completion.independentReviewGate, workchainSummary.independent_review_gate, workchainSummary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    const required = firstBoolean(report.independent_review_required, report.independentReviewRequired, summary.independent_review_required, summary.independentReviewRequired, completion.independent_review_required, completion.independentReviewRequired, workchainSummary.independent_review_required, workchainSummary.independentReviewRequired, task.delivery_summary?.independent_review_required, task.delivery_summary?.independentReviewRequired, task.requires_independent_review, task.requiresIndependentReview, gate?.required);
    const passed = firstBoolean(report.independent_review_gate_passed, report.independentReviewGatePassed, summary.independent_review_gate_passed, summary.independentReviewGatePassed, completion.independent_review_gate_passed, completion.independentReviewGatePassed, workchainSummary.independent_review_gate_passed, workchainSummary.independentReviewGatePassed, task.delivery_summary?.independent_review_gate_passed, task.delivery_summary?.independentReviewGatePassed, gate?.pass, gate?.passed);
    const rawEvidence = collectRawDeliveryIndependentReviewEvidence(input);
    const weakRows = uniqueDeliveryLines(rawEvidence.map(deliveryIndependentReviewWeakPassSummary));
    const gateEvidenceCount = firstDeliveryNumber(gate?.evidence_count, gate?.evidenceCount);
    const gateClaimsPassWithoutEvidence = (required === true || passed === true)
        && passed === true
        && (!rawEvidence.length || gateEvidenceCount === 0);
    return uniqueDeliveryLines(weakRows, gateClaimsPassWithoutEvidence ? "独立复核标记为已通过，但缺少可核对的复核证据。" : "").slice(0, 4);
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
//# sourceMappingURL=delivery-report-part-01-part-01.js.map