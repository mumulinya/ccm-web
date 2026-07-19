"use strict";
// Behavior-freeze split from delivery-report-part-01.ts (part 2/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDeliveryIndependentReview = collectDeliveryIndependentReview;
exports.collectDeliveryPostReviewSpotCheck = collectDeliveryPostReviewSpotCheck;
exports.collectDeliveryRisks = collectDeliveryRisks;
exports.deliveryPlanStepText = deliveryPlanStepText;
exports.collectDeliveryPlanAcceptedFeedback = collectDeliveryPlanAcceptedFeedback;
exports.collectDeliveryAcceptedFeedbackForQuality = collectDeliveryAcceptedFeedbackForQuality;
exports.collectDeliveryPlanAlignmentGaps = collectDeliveryPlanAlignmentGaps;
// Behavior-freeze split from delivery-report.ts (part 1/2).
const post_review_spot_check_1 = require("./post-review-spot-check");
const delivery_report_part_01_part_01_1 = require("./delivery-report-part-01-part-01");
function collectDeliveryIndependentReview(input, status) {
    const { report, summary, completion, workchainSummary } = (0, delivery_report_part_01_part_01_1.getNestedReport)(input);
    const task = input.task || {};
    const gate = (0, delivery_report_part_01_part_01_1.firstObject)(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, completion.independent_review_gate, completion.independentReviewGate, workchainSummary.independent_review_gate, workchainSummary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    const required = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.independent_review_required, report.independentReviewRequired, summary.independent_review_required, summary.independentReviewRequired, completion.independent_review_required, completion.independentReviewRequired, workchainSummary.independent_review_required, workchainSummary.independentReviewRequired, task.delivery_summary?.independent_review_required, task.delivery_summary?.independentReviewRequired, task.requires_independent_review, task.requiresIndependentReview, gate?.required);
    const passed = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.independent_review_gate_passed, report.independentReviewGatePassed, summary.independent_review_gate_passed, summary.independentReviewGatePassed, completion.independent_review_gate_passed, completion.independentReviewGatePassed, workchainSummary.independent_review_gate_passed, workchainSummary.independentReviewGatePassed, task.delivery_summary?.independent_review_gate_passed, task.delivery_summary?.independentReviewGatePassed, gate?.pass, gate?.passed);
    const failedEvidence = (0, delivery_report_part_01_part_01_1.collectFailedIndependentReviewEvidence)(input);
    const incompleteEvidence = (0, delivery_report_part_01_part_01_1.collectIncompleteIndependentReviewEvidence)(input);
    const weakPassedEvidence = (0, delivery_report_part_01_part_01_1.collectWeakPassedIndependentReviewEvidence)(input);
    const gateStatus = String(gate?.status
        || report.independent_review_status
        || report.independentReviewStatus
        || summary.independent_review_status
        || summary.independentReviewStatus
        || "").trim();
    const evidence = (0, delivery_report_part_01_part_01_1.collectRawDeliveryIndependentReviewEvidence)(input).map(delivery_report_part_01_part_01_1.formatDeliveryIndependentReviewEvidence).filter(Boolean);
    if (required !== true && !evidence.length)
        return [];
    const headline = failedEvidence.length || passed === false || /failed|rejected|blocked/i.test(gateStatus)
        ? "独立复核：未通过，仍需按复核意见返工"
        : incompleteEvidence.length || /partial|incomplete|inconclusive|unable[_-]?to[_-]?verify|skipped/i.test(gateStatus)
            ? "独立复核：部分完成，仍有内容需要补齐"
            : weakPassedEvidence.length
                ? "独立复核：已标记通过，但复核证据仍需补齐"
                : required === true
                    ? passed === true
                        ? "独立复核：已通过"
                        : status === "cancelled"
                            ? "独立复核：任务已停止，未继续复核"
                            : "独立复核：待补齐"
                    : "独立复核：已记录";
    const reason = (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(gate?.reason || summary.independent_review_reason || report.independent_review_reason || "", "", 220);
    return (0, delivery_report_part_01_part_01_1.uniqueDeliveryLines)(headline, required === true && reason ? `触发原因：${reason}` : "", evidence.slice(0, 4)).slice(0, 8);
}
function collectDeliveryPostReviewSpotCheck(input) {
    const { report, summary, completion, workchainSummary } = (0, delivery_report_part_01_part_01_1.getNestedReport)(input);
    const task = input.task || {};
    const gate = (0, delivery_report_part_01_part_01_1.firstObject)(report.post_review_spot_check_gate, report.postReviewSpotCheckGate, summary.post_review_spot_check_gate, summary.postReviewSpotCheckGate, completion.post_review_spot_check_gate, completion.postReviewSpotCheckGate, workchainSummary.post_review_spot_check_gate, workchainSummary.postReviewSpotCheckGate, task.delivery_summary?.post_review_spot_check_gate, task.delivery_summary?.postReviewSpotCheckGate);
    const spotCheck = (0, delivery_report_part_01_part_01_1.firstObject)(report.post_review_spot_check, report.postReviewSpotCheck, summary.post_review_spot_check, summary.postReviewSpotCheck, completion.post_review_spot_check, completion.postReviewSpotCheck, workchainSummary.post_review_spot_check, workchainSummary.postReviewSpotCheck, task.delivery_summary?.post_review_spot_check, task.delivery_summary?.postReviewSpotCheck, gate?.latest);
    const visibleSummary = (0, delivery_report_part_01_part_01_1.firstObject)(report.post_review_spot_check_summary, report.postReviewSpotCheckSummary, summary.post_review_spot_check_summary, summary.postReviewSpotCheckSummary, completion.post_review_spot_check_summary, completion.postReviewSpotCheckSummary, workchainSummary.post_review_spot_check_summary, workchainSummary.postReviewSpotCheckSummary, task.delivery_summary?.post_review_spot_check_summary, task.delivery_summary?.postReviewSpotCheckSummary, gate?.summary, (0, post_review_spot_check_1.buildPostReviewSpotCheckSummary)(spotCheck));
    const required = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.post_review_spot_check_required, report.postReviewSpotCheckRequired, summary.post_review_spot_check_required, summary.postReviewSpotCheckRequired, completion.post_review_spot_check_required, completion.postReviewSpotCheckRequired, workchainSummary.post_review_spot_check_required, workchainSummary.postReviewSpotCheckRequired, task.delivery_summary?.post_review_spot_check_required, task.delivery_summary?.postReviewSpotCheckRequired, gate?.required, spotCheck?.required);
    if (required !== true && !visibleSummary)
        return [];
    return (0, delivery_report_part_01_part_01_1.uniqueDeliveryLines)((0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(visibleSummary?.headline || gate?.reason || "", required === true ? "TestAgent 通过后的完成前抽查仍在进行。" : "完成前抽查已记录。", 260), ...(Array.isArray(visibleSummary?.rows)
        ? visibleSummary.rows.map((item) => (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item, "抽查状态已记录。", 220))
        : [])).slice(0, 6);
}
function collectDeliveryRisks(input) {
    const { report, summary, completion, workchainSummary } = (0, delivery_report_part_01_part_01_1.getNestedReport)(input);
    const task = input.task || {};
    const run = input.run || {};
    const independentReviewGate = (0, delivery_report_part_01_part_01_1.firstObject)(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    const independentReviewRequired = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.independent_review_required, report.independentReviewRequired, summary.independent_review_required, summary.independentReviewRequired, task.delivery_summary?.independent_review_required, task.delivery_summary?.independentReviewRequired, task.requires_independent_review, task.requiresIndependentReview, independentReviewGate?.required);
    const independentReviewPassed = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.independent_review_gate_passed, report.independentReviewGatePassed, summary.independent_review_gate_passed, summary.independentReviewGatePassed, task.delivery_summary?.independent_review_gate_passed, task.delivery_summary?.independentReviewGatePassed, independentReviewGate?.pass, independentReviewGate?.passed);
    const failedIndependentReviewEvidence = (0, delivery_report_part_01_part_01_1.collectFailedIndependentReviewEvidence)(input);
    const failedIndependentReviewRisk = failedIndependentReviewEvidence.length
        ? `独立复核未通过：${failedIndependentReviewEvidence[0]}`
        : "";
    const incompleteIndependentReviewEvidence = (0, delivery_report_part_01_part_01_1.collectIncompleteIndependentReviewEvidence)(input);
    const incompleteIndependentReviewRisk = incompleteIndependentReviewEvidence.length
        ? `独立复核未完全确认：${incompleteIndependentReviewEvidence[0]}`
        : "";
    const weakPassedIndependentReviewEvidence = (0, delivery_report_part_01_part_01_1.collectWeakPassedIndependentReviewEvidence)(input);
    const weakPassedIndependentReviewRisk = weakPassedIndependentReviewEvidence.length
        ? `独立复核证据不足：${weakPassedIndependentReviewEvidence[0]}`
        : "";
    const independentReviewRisk = failedIndependentReviewRisk || (independentReviewRequired === true && independentReviewPassed !== true
        ? `复杂变更缺少独立复核${independentReviewGate?.reason ? `：${independentReviewGate.reason}` : ""}`
        : incompleteIndependentReviewRisk || weakPassedIndependentReviewRisk);
    const postReviewSpotCheckGate = (0, delivery_report_part_01_part_01_1.firstObject)(report.post_review_spot_check_gate, report.postReviewSpotCheckGate, summary.post_review_spot_check_gate, summary.postReviewSpotCheckGate, completion.post_review_spot_check_gate, completion.postReviewSpotCheckGate, workchainSummary.post_review_spot_check_gate, workchainSummary.postReviewSpotCheckGate, task.delivery_summary?.post_review_spot_check_gate, task.delivery_summary?.postReviewSpotCheckGate);
    const postReviewSpotCheckRequired = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.post_review_spot_check_required, summary.post_review_spot_check_required, completion.post_review_spot_check_required, workchainSummary.post_review_spot_check_required, task.delivery_summary?.post_review_spot_check_required, postReviewSpotCheckGate?.required);
    const postReviewSpotCheckPassed = (0, delivery_report_part_01_part_01_1.firstBoolean)(report.post_review_spot_check_gate_passed, summary.post_review_spot_check_gate_passed, completion.post_review_spot_check_gate_passed, workchainSummary.post_review_spot_check_gate_passed, task.delivery_summary?.post_review_spot_check_gate_passed, postReviewSpotCheckGate?.pass);
    const postReviewSpotCheckLines = collectDeliveryPostReviewSpotCheck(input);
    const postReviewSpotCheckRisk = postReviewSpotCheckRequired === true && postReviewSpotCheckPassed !== true
        ? `完成前抽查尚未通过：${postReviewSpotCheckLines[0] || postReviewSpotCheckGate?.reason || "需要重新运行 TestAgent 并再次抽查关键验证"}`
        : "";
    const failedVerificationEvidence = (0, delivery_report_part_01_part_01_1.collectFailedDeliveryVerificationEvidence)(input);
    const failedVerificationRisk = failedVerificationEvidence.length
        ? `验证失败：${failedVerificationEvidence[0]}`
        : "";
    const incompleteVerificationEvidence = (0, delivery_report_part_01_part_01_1.collectIncompleteDeliveryVerificationEvidence)(input);
    const incompleteVerificationRisk = incompleteVerificationEvidence.length
        ? `验证未完成：${incompleteVerificationEvidence[0]}`
        : "";
    const weakMissingVerificationEvidence = (0, delivery_report_part_01_part_01_1.collectWeakMissingDeliveryVerificationEvidence)(input);
    const weakMissingVerificationRisk = weakMissingVerificationEvidence.length
        ? `验证证据不足：${weakMissingVerificationEvidence[0]}`
        : "";
    const failedChecks = [
        ...((0, delivery_report_part_01_part_01_1.asArray)(report.acceptance_gate?.failed_checks).map((item) => item?.label || item?.id || item)),
        ...((0, delivery_report_part_01_part_01_1.asArray)(summary.acceptance_gate?.failed_checks).map((item) => item?.label || item?.id || item)),
    ];
    return (0, delivery_report_part_01_part_01_1.uniqueDeliveryStrings)(run.error, input.status && (0, delivery_report_part_01_part_01_1.normalizeDeliveryStatus)(input.status) !== "done" ? input.detail : "", report.risks, report.remaining_items, report.blockers, report.needs, report.blocking_needs, report.advisory_needs, report.verification_required_missing, summary.risks, summary.remaining_items, summary.blockers, summary.needs, summary.blocking_needs, summary.advisory_needs, summary.verification_required_missing, failedVerificationRisk, incompleteVerificationRisk, weakMissingVerificationRisk, independentReviewRisk, postReviewSpotCheckRisk, task.receipt?.blockers, task.receipt?.needs, completion.risks, workchainSummary.risks, failedChecks).slice(0, 10);
}
function deliveryPlanStepText(item) {
    if (!item || typeof item !== "object")
        return (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item, "", 180);
    return (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item.content || item.subject || item.title || item.label || item.summary || item.activeForm || item.active_form || "", "", 180);
}
function deliveryPlanAcceptedFeedbackText(item) {
    if (!item || typeof item !== "object")
        return (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item, "", 260);
    return (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item.feedback || item.text || item.message || item.detail || item.summary || item.content || "", "", 260);
}
function collectDeliveryPlanAcceptedFeedback(input, plan) {
    const { report, summary, completion, workchainSummary } = (0, delivery_report_part_01_part_01_1.getNestedReport)(input);
    const task = input.task || {};
    const run = input.run || {};
    const history = [
        ...(0, delivery_report_part_01_part_01_1.asArray)(plan?.accepted_feedback_history).map(deliveryPlanAcceptedFeedbackText),
        ...(0, delivery_report_part_01_part_01_1.asArray)(plan?.acceptedFeedbackHistory).map(deliveryPlanAcceptedFeedbackText),
    ];
    return (0, delivery_report_part_01_part_01_1.uniqueDeliveryStrings)(plan?.accepted_feedback, plan?.acceptedFeedback, plan?.last_accept_feedback, plan?.lastAcceptFeedback, report.plan_accept_feedback, report.planAcceptFeedback, report.last_plan_accept_feedback, report.lastPlanAcceptFeedback, summary.plan_accept_feedback, summary.planAcceptFeedback, summary.last_plan_accept_feedback, summary.lastPlanAcceptFeedback, completion.plan_accept_feedback, completion.planAcceptFeedback, workchainSummary.plan_accept_feedback, workchainSummary.planAcceptFeedback, task.plan_accept_feedback, task.planAcceptFeedback, task.last_plan_accept_feedback, task.lastPlanAcceptFeedback, run.plan_accept_feedback, run.planAcceptFeedback, run.last_plan_accept_feedback, run.lastPlanAcceptFeedback, history).slice(0, 2);
}
function collectDeliveryAcceptedFeedbackForQuality(input) {
    const { report, summary, completion, workchainSummary } = (0, delivery_report_part_01_part_01_1.getNestedReport)(input);
    const task = input.task || {};
    const run = input.run || {};
    const plan = (0, delivery_report_part_01_part_01_1.firstObject)(report.plan_mode, report.planMode, summary.plan_mode, summary.planMode, completion.plan_mode, completion.planMode, workchainSummary.plan_mode, workchainSummary.planMode, task.plan_mode, task.planMode, run.plan_mode, run.planMode);
    return collectDeliveryPlanAcceptedFeedback(input, plan);
}
function isDeliveryPlanGapItem(item) {
    if (!item || typeof item !== "object")
        return Boolean(String(item || "").trim());
    const ok = (0, delivery_report_part_01_part_01_1.firstBoolean)(item.ok, item.pass, item.passed, item.complete, item.completed);
    if (ok === false)
        return true;
    const status = String(item.status || item.result || item.state || "").toLowerCase();
    return ["failed", "fail", "missing", "deviated", "needs_evidence", "blocked", "pending", "todo", "uncovered"].includes(status);
}
function formatDeliveryPlanGapItem(item) {
    if (!item || typeof item !== "object") {
        const text = (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item, "", 220);
        return /^[a-z0-9_-]+$/i.test(text) && /[_-]/.test(text) ? "" : text;
    }
    const label = (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(item.label || item.title || item.name || item.subject || item.step || item.content || item.summary || "", "", 140);
    const missing = (0, delivery_report_part_01_part_01_1.uniqueDeliveryStrings)(item.missing, item.missing_items, item.missingItems, item.required, item.expected).slice(0, 3);
    const reason = (0, delivery_report_part_01_part_01_1.uniqueDeliveryLines)(item.reason, item.detail, item.message, item.status_label, item.statusLabel, missing.length ? `缺少：${missing.join("、")}` : "").slice(0, 2).join("；");
    if (label && reason && !label.includes(reason))
        return (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(`${label}（${reason}）`, "", 320);
    return (0, delivery_report_part_01_part_01_1.sanitizeMainAgentDeliveryText)(label || reason, "", 260);
}
function collectDeliveryPlanAlignmentGaps(planAlignment) {
    if (!planAlignment || typeof planAlignment !== "object")
        return [];
    const failedChecks = (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.checks)
        .filter(isDeliveryPlanGapItem)
        .map(formatDeliveryPlanGapItem);
    return (0, delivery_report_part_01_part_01_1.uniqueDeliveryLines)((0, delivery_report_part_01_part_01_1.asArray)(planAlignment.deviations).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.gaps).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.remaining_gaps).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.remainingGaps).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.uncovered_steps).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.uncoveredSteps).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.failed_checks).map(formatDeliveryPlanGapItem), (0, delivery_report_part_01_part_01_1.asArray)(planAlignment.failedChecks).map(formatDeliveryPlanGapItem), failedChecks).slice(0, 3);
}
//# sourceMappingURL=delivery-report-part-01-part-02.js.map