// Behavior-freeze split from delivery-report-part-01.ts (part 2/2).

// Behavior-freeze split from delivery-report.ts (part 1/2).
import { buildPostReviewSpotCheckSummary } from "./post-review-spot-check";
import type {
  MainAgentDeliveryStatus,
  MainAgentDeliveryReportInput,
} from "./delivery-report-part-01-part-01";
import {
  asArray,
  collectFailedDeliveryVerificationEvidence,
  collectFailedIndependentReviewEvidence,
  collectIncompleteDeliveryVerificationEvidence,
  collectIncompleteIndependentReviewEvidence,
  collectRawDeliveryIndependentReviewEvidence,
  collectWeakMissingDeliveryVerificationEvidence,
  collectWeakPassedIndependentReviewEvidence,
  firstBoolean,
  firstObject,
  formatDeliveryIndependentReviewEvidence,
  getNestedReport,
  normalizeDeliveryStatus,
  sanitizeMainAgentDeliveryText,
  uniqueDeliveryLines,
  uniqueDeliveryStrings,
} from "./delivery-report-part-01-part-01";

export function collectDeliveryIndependentReview(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const gate = firstObject(
    report.independent_review_gate,
    report.independentReviewGate,
    summary.independent_review_gate,
    summary.independentReviewGate,
    completion.independent_review_gate,
    completion.independentReviewGate,
    workchainSummary.independent_review_gate,
    workchainSummary.independentReviewGate,
    task.delivery_summary?.independent_review_gate,
    task.delivery_summary?.independentReviewGate,
  );
  const required = firstBoolean(
    report.independent_review_required,
    report.independentReviewRequired,
    summary.independent_review_required,
    summary.independentReviewRequired,
    completion.independent_review_required,
    completion.independentReviewRequired,
    workchainSummary.independent_review_required,
    workchainSummary.independentReviewRequired,
    task.delivery_summary?.independent_review_required,
    task.delivery_summary?.independentReviewRequired,
    task.requires_independent_review,
    task.requiresIndependentReview,
    gate?.required,
  );
  const passed = firstBoolean(
    report.independent_review_gate_passed,
    report.independentReviewGatePassed,
    summary.independent_review_gate_passed,
    summary.independentReviewGatePassed,
    completion.independent_review_gate_passed,
    completion.independentReviewGatePassed,
    workchainSummary.independent_review_gate_passed,
    workchainSummary.independentReviewGatePassed,
    task.delivery_summary?.independent_review_gate_passed,
    task.delivery_summary?.independentReviewGatePassed,
    gate?.pass,
    gate?.passed,
  );
  const failedEvidence = collectFailedIndependentReviewEvidence(input);
  const incompleteEvidence = collectIncompleteIndependentReviewEvidence(input);
  const weakPassedEvidence = collectWeakPassedIndependentReviewEvidence(input);
  const gateStatus = String(
    gate?.status
      || report.independent_review_status
      || report.independentReviewStatus
      || summary.independent_review_status
      || summary.independentReviewStatus
      || "",
  ).trim();
  const evidence = collectRawDeliveryIndependentReviewEvidence(input).map(formatDeliveryIndependentReviewEvidence).filter(Boolean);
  if (required !== true && !evidence.length) return [];
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
  const reason = sanitizeMainAgentDeliveryText(gate?.reason || summary.independent_review_reason || report.independent_review_reason || "", "", 220);
  return uniqueDeliveryLines(
    headline,
    required === true && reason ? `触发原因：${reason}` : "",
    evidence.slice(0, 4),
  ).slice(0, 8);
}

export function collectDeliveryPostReviewSpotCheck(input: MainAgentDeliveryReportInput) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const gate = firstObject(
    report.post_review_spot_check_gate,
    report.postReviewSpotCheckGate,
    summary.post_review_spot_check_gate,
    summary.postReviewSpotCheckGate,
    completion.post_review_spot_check_gate,
    completion.postReviewSpotCheckGate,
    workchainSummary.post_review_spot_check_gate,
    workchainSummary.postReviewSpotCheckGate,
    task.delivery_summary?.post_review_spot_check_gate,
    task.delivery_summary?.postReviewSpotCheckGate,
  );
  const spotCheck = firstObject(
    report.post_review_spot_check,
    report.postReviewSpotCheck,
    summary.post_review_spot_check,
    summary.postReviewSpotCheck,
    completion.post_review_spot_check,
    completion.postReviewSpotCheck,
    workchainSummary.post_review_spot_check,
    workchainSummary.postReviewSpotCheck,
    task.delivery_summary?.post_review_spot_check,
    task.delivery_summary?.postReviewSpotCheck,
    gate?.latest,
  );
  const visibleSummary = firstObject(
    report.post_review_spot_check_summary,
    report.postReviewSpotCheckSummary,
    summary.post_review_spot_check_summary,
    summary.postReviewSpotCheckSummary,
    completion.post_review_spot_check_summary,
    completion.postReviewSpotCheckSummary,
    workchainSummary.post_review_spot_check_summary,
    workchainSummary.postReviewSpotCheckSummary,
    task.delivery_summary?.post_review_spot_check_summary,
    task.delivery_summary?.postReviewSpotCheckSummary,
    gate?.summary,
    buildPostReviewSpotCheckSummary(spotCheck),
  );
  const required = firstBoolean(
    report.post_review_spot_check_required,
    report.postReviewSpotCheckRequired,
    summary.post_review_spot_check_required,
    summary.postReviewSpotCheckRequired,
    completion.post_review_spot_check_required,
    completion.postReviewSpotCheckRequired,
    workchainSummary.post_review_spot_check_required,
    workchainSummary.postReviewSpotCheckRequired,
    task.delivery_summary?.post_review_spot_check_required,
    task.delivery_summary?.postReviewSpotCheckRequired,
    gate?.required,
    spotCheck?.required,
  );
  if (required !== true && !visibleSummary) return [];
  return uniqueDeliveryLines(
    sanitizeMainAgentDeliveryText(
      visibleSummary?.headline || gate?.reason || "",
      required === true ? "TestAgent 通过后的完成前抽查仍在进行。" : "完成前抽查已记录。",
      260,
    ),
    ...(Array.isArray(visibleSummary?.rows)
      ? visibleSummary.rows.map((item: any) => sanitizeMainAgentDeliveryText(item, "抽查状态已记录。", 220))
      : []),
  ).slice(0, 6);
}

export function collectDeliveryRisks(input: MainAgentDeliveryReportInput) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const run = input.run || {};
  const independentReviewGate = firstObject(
    report.independent_review_gate,
    report.independentReviewGate,
    summary.independent_review_gate,
    summary.independentReviewGate,
    task.delivery_summary?.independent_review_gate,
    task.delivery_summary?.independentReviewGate,
  );
  const independentReviewRequired = firstBoolean(
    report.independent_review_required,
    report.independentReviewRequired,
    summary.independent_review_required,
    summary.independentReviewRequired,
    task.delivery_summary?.independent_review_required,
    task.delivery_summary?.independentReviewRequired,
    task.requires_independent_review,
    task.requiresIndependentReview,
    independentReviewGate?.required,
  );
  const independentReviewPassed = firstBoolean(
    report.independent_review_gate_passed,
    report.independentReviewGatePassed,
    summary.independent_review_gate_passed,
    summary.independentReviewGatePassed,
    task.delivery_summary?.independent_review_gate_passed,
    task.delivery_summary?.independentReviewGatePassed,
    independentReviewGate?.pass,
    independentReviewGate?.passed,
  );
  const failedIndependentReviewEvidence = collectFailedIndependentReviewEvidence(input);
  const failedIndependentReviewRisk = failedIndependentReviewEvidence.length
    ? `独立复核未通过：${failedIndependentReviewEvidence[0]}`
    : "";
  const incompleteIndependentReviewEvidence = collectIncompleteIndependentReviewEvidence(input);
  const incompleteIndependentReviewRisk = incompleteIndependentReviewEvidence.length
    ? `独立复核未完全确认：${incompleteIndependentReviewEvidence[0]}`
    : "";
  const weakPassedIndependentReviewEvidence = collectWeakPassedIndependentReviewEvidence(input);
  const weakPassedIndependentReviewRisk = weakPassedIndependentReviewEvidence.length
    ? `独立复核证据不足：${weakPassedIndependentReviewEvidence[0]}`
    : "";
  const independentReviewRisk = failedIndependentReviewRisk || (independentReviewRequired === true && independentReviewPassed !== true
    ? `复杂变更缺少独立复核${independentReviewGate?.reason ? `：${independentReviewGate.reason}` : ""}`
    : incompleteIndependentReviewRisk || weakPassedIndependentReviewRisk);
  const postReviewSpotCheckGate = firstObject(
    report.post_review_spot_check_gate,
    report.postReviewSpotCheckGate,
    summary.post_review_spot_check_gate,
    summary.postReviewSpotCheckGate,
    completion.post_review_spot_check_gate,
    completion.postReviewSpotCheckGate,
    workchainSummary.post_review_spot_check_gate,
    workchainSummary.postReviewSpotCheckGate,
    task.delivery_summary?.post_review_spot_check_gate,
    task.delivery_summary?.postReviewSpotCheckGate,
  );
  const postReviewSpotCheckRequired = firstBoolean(
    report.post_review_spot_check_required,
    summary.post_review_spot_check_required,
    completion.post_review_spot_check_required,
    workchainSummary.post_review_spot_check_required,
    task.delivery_summary?.post_review_spot_check_required,
    postReviewSpotCheckGate?.required,
  );
  const postReviewSpotCheckPassed = firstBoolean(
    report.post_review_spot_check_gate_passed,
    summary.post_review_spot_check_gate_passed,
    completion.post_review_spot_check_gate_passed,
    workchainSummary.post_review_spot_check_gate_passed,
    task.delivery_summary?.post_review_spot_check_gate_passed,
    postReviewSpotCheckGate?.pass,
  );
  const postReviewSpotCheckLines = collectDeliveryPostReviewSpotCheck(input);
  const postReviewSpotCheckRisk = postReviewSpotCheckRequired === true && postReviewSpotCheckPassed !== true
    ? `完成前抽查尚未通过：${postReviewSpotCheckLines[0] || postReviewSpotCheckGate?.reason || "需要重新运行 TestAgent 并再次抽查关键验证"}`
    : "";
  const failedVerificationEvidence = collectFailedDeliveryVerificationEvidence(input);
  const failedVerificationRisk = failedVerificationEvidence.length
    ? `验证失败：${failedVerificationEvidence[0]}`
    : "";
  const incompleteVerificationEvidence = collectIncompleteDeliveryVerificationEvidence(input);
  const incompleteVerificationRisk = incompleteVerificationEvidence.length
    ? `验证未完成：${incompleteVerificationEvidence[0]}`
    : "";
  const weakMissingVerificationEvidence = collectWeakMissingDeliveryVerificationEvidence(input);
  const weakMissingVerificationRisk = weakMissingVerificationEvidence.length
    ? `验证证据不足：${weakMissingVerificationEvidence[0]}`
    : "";
  const failedChecks = [
    ...(asArray(report.acceptance_gate?.failed_checks).map((item: any) => item?.label || item?.id || item)),
    ...(asArray(summary.acceptance_gate?.failed_checks).map((item: any) => item?.label || item?.id || item)),
  ];
  return uniqueDeliveryStrings(
    run.error,
    input.status && normalizeDeliveryStatus(input.status) !== "done" ? input.detail : "",
    report.risks,
    report.remaining_items,
    report.blockers,
    report.needs,
    report.blocking_needs,
    report.advisory_needs,
    report.verification_required_missing,
    summary.risks,
    summary.remaining_items,
    summary.blockers,
    summary.needs,
    summary.blocking_needs,
    summary.advisory_needs,
    summary.verification_required_missing,
    failedVerificationRisk,
    incompleteVerificationRisk,
    weakMissingVerificationRisk,
    independentReviewRisk,
    postReviewSpotCheckRisk,
    task.receipt?.blockers,
    task.receipt?.needs,
    completion.risks,
    workchainSummary.risks,
    failedChecks,
  ).slice(0, 10);
}

export function deliveryPlanStepText(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "", 180);
  return sanitizeMainAgentDeliveryText(item.content || item.subject || item.title || item.label || item.summary || item.activeForm || item.active_form || "", "", 180);
}

function deliveryPlanAcceptedFeedbackText(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "", 260);
  return sanitizeMainAgentDeliveryText(item.feedback || item.text || item.message || item.detail || item.summary || item.content || "", "", 260);
}

export function collectDeliveryPlanAcceptedFeedback(input: MainAgentDeliveryReportInput, plan: any) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const run = input.run || {};
  const history = [
    ...asArray(plan?.accepted_feedback_history).map(deliveryPlanAcceptedFeedbackText),
    ...asArray(plan?.acceptedFeedbackHistory).map(deliveryPlanAcceptedFeedbackText),
  ];
  return uniqueDeliveryStrings(
    plan?.accepted_feedback,
    plan?.acceptedFeedback,
    plan?.last_accept_feedback,
    plan?.lastAcceptFeedback,
    report.plan_accept_feedback,
    report.planAcceptFeedback,
    report.last_plan_accept_feedback,
    report.lastPlanAcceptFeedback,
    summary.plan_accept_feedback,
    summary.planAcceptFeedback,
    summary.last_plan_accept_feedback,
    summary.lastPlanAcceptFeedback,
    completion.plan_accept_feedback,
    completion.planAcceptFeedback,
    workchainSummary.plan_accept_feedback,
    workchainSummary.planAcceptFeedback,
    task.plan_accept_feedback,
    task.planAcceptFeedback,
    task.last_plan_accept_feedback,
    task.lastPlanAcceptFeedback,
    run.plan_accept_feedback,
    run.planAcceptFeedback,
    run.last_plan_accept_feedback,
    run.lastPlanAcceptFeedback,
    history,
  ).slice(0, 2);
}

export function collectDeliveryAcceptedFeedbackForQuality(input: MainAgentDeliveryReportInput) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const run = input.run || {};
  const plan = firstObject(
    report.plan_mode,
    report.planMode,
    summary.plan_mode,
    summary.planMode,
    completion.plan_mode,
    completion.planMode,
    workchainSummary.plan_mode,
    workchainSummary.planMode,
    task.plan_mode,
    task.planMode,
    run.plan_mode,
    run.planMode,
  );
  return collectDeliveryPlanAcceptedFeedback(input, plan);
}

function isDeliveryPlanGapItem(item: any) {
  if (!item || typeof item !== "object") return Boolean(String(item || "").trim());
  const ok = firstBoolean(item.ok, item.pass, item.passed, item.complete, item.completed);
  if (ok === false) return true;
  const status = String(item.status || item.result || item.state || "").toLowerCase();
  return ["failed", "fail", "missing", "deviated", "needs_evidence", "blocked", "pending", "todo", "uncovered"].includes(status);
}

function formatDeliveryPlanGapItem(item: any) {
  if (!item || typeof item !== "object") {
    const text = sanitizeMainAgentDeliveryText(item, "", 220);
    return /^[a-z0-9_-]+$/i.test(text) && /[_-]/.test(text) ? "" : text;
  }
  const label = sanitizeMainAgentDeliveryText(
    item.label || item.title || item.name || item.subject || item.step || item.content || item.summary || "",
    "",
    140,
  );
  const missing = uniqueDeliveryStrings(item.missing, item.missing_items, item.missingItems, item.required, item.expected).slice(0, 3);
  const reason = uniqueDeliveryLines(
    item.reason,
    item.detail,
    item.message,
    item.status_label,
    item.statusLabel,
    missing.length ? `缺少：${missing.join("、")}` : "",
  ).slice(0, 2).join("；");
  if (label && reason && !label.includes(reason)) return sanitizeMainAgentDeliveryText(`${label}（${reason}）`, "", 320);
  return sanitizeMainAgentDeliveryText(label || reason, "", 260);
}

export function collectDeliveryPlanAlignmentGaps(planAlignment: any) {
  if (!planAlignment || typeof planAlignment !== "object") return [];
  const failedChecks = asArray(planAlignment.checks)
    .filter(isDeliveryPlanGapItem)
    .map(formatDeliveryPlanGapItem);
  return uniqueDeliveryLines(
    asArray(planAlignment.deviations).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.gaps).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.remaining_gaps).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.remainingGaps).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.uncovered_steps).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.uncoveredSteps).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.failed_checks).map(formatDeliveryPlanGapItem),
    asArray(planAlignment.failedChecks).map(formatDeliveryPlanGapItem),
    failedChecks,
  ).slice(0, 3);
}
