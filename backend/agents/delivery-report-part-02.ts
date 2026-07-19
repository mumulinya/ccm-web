// Behavior-freeze split from delivery-report.ts (part 2/2).
import type { MainAgentDeliveryReportInput, MainAgentDeliveryStatus } from "./delivery-report-part-01";
import {
  FINAL_SUMMARY_PROTOCOL_LEAK_PATTERN,
  INTERNAL_DELIVERY_TEXT_PATTERN,
  asArray,
  collectDeliveryAcceptedFeedbackForQuality,
  collectDeliveryFiles,
  collectDeliveryIndependentReview,
  collectDeliveryPlanAcceptedFeedback,
  collectDeliveryPlanAlignmentGaps,
  collectDeliveryPostReviewSpotCheck,
  collectDeliveryRisks,
  collectDeliveryVerification,
  collectDeliveryVerificationEvidence,
  deliveryPlanStepText,
  deliveryStatusLabel,
  deliveryTitle,
  deliveryVerificationFailureText,
  deliveryVerificationSuccessText,
  firstBoolean,
  firstObject,
  getNestedReport,
  hasBlockingDeliveryCompletionGap,
  normalizeDeliveryStatus,
  sanitizeMainAgentDeliveryText,
  uniqueDeliveryLines,
  uniqueDeliveryStrings,
} from "./delivery-report-part-01";

function collectDeliveryPlanReview(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus) {
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
  const planAlignment = firstObject(
    report.plan_alignment,
    report.planAlignment,
    summary.plan_alignment,
    summary.planAlignment,
    completion.plan_alignment,
    completion.planAlignment,
    workchainSummary.plan_alignment,
    workchainSummary.planAlignment,
    task.delivery_summary?.plan_alignment,
    task.delivery_summary?.planAlignment,
  );
  const todo = firstObject(
    report.todo_plan,
    report.todoPlan,
    summary.todo_plan,
    summary.todoPlan,
    task.todo_plan,
    task.todoPlan,
    run.todo_plan,
    run.todoPlan,
  );
  const modeTitle = sanitizeMainAgentDeliveryText(plan?.title || plan?.mode_label || plan?.modeLabel || (plan ? "执行前计划" : ""), "", 120);
  const scope = uniqueDeliveryStrings(
    plan?.impact_scope?.areas,
    plan?.impactScope?.areas,
    plan?.impact_scope?.projects,
    plan?.impactScope?.projects,
  ).slice(0, 3);
  const steps = uniqueDeliveryStrings(
    report.plan_steps,
    report.planSteps,
    summary.plan_steps,
    summary.planSteps,
    asArray(plan?.steps).map(deliveryPlanStepText),
    asArray(todo?.steps).map(deliveryPlanStepText),
  ).slice(0, 4);
  const acceptedFeedback = collectDeliveryPlanAcceptedFeedback(input, plan);
  const acceptance = uniqueDeliveryStrings(
    plan?.acceptance,
    plan?.acceptance_criteria,
    plan?.acceptanceCriteria,
    report.acceptance_criteria,
    report.acceptanceCriteria,
    summary.acceptance_criteria,
    summary.acceptanceCriteria,
    task.acceptance_criteria,
    task.acceptanceCriteria,
    run.acceptance_criteria,
    run.acceptanceCriteria,
  ).slice(0, 3);
  const alignmentGaps = collectDeliveryPlanAlignmentGaps(planAlignment);
  const planStatus = String(planAlignment?.status || "").toLowerCase();
  const alignmentText = planStatus === "aligned"
    ? "计划核对：已对齐"
    : ["deviated", "needs_evidence", "failed"].includes(planStatus)
      ? "计划核对：仍有缺口"
      : planStatus
        ? `计划核对：${planAlignment.status_label || planAlignment.statusLabel || planAlignment.status}`
        : "";
  const fallback = status === "waiting"
    ? "计划回顾：我正在按当前计划推进，完成后会补齐验收和总结。"
    : "计划回顾：未捕获到单独计划记录，我已按交付证据整理结果。";
  const items = uniqueDeliveryLines(
    modeTitle ? `执行前计划：${modeTitle}` : "",
    alignmentGaps.length ? `计划缺口：${alignmentGaps.join("；")}` : "",
    scope.length ? `计划范围：${scope.join("；")}` : "",
    steps.length ? `计划步骤：${steps.join("；")}` : "",
    acceptedFeedback.length ? `确认补充要求：${acceptedFeedback.join("；")}` : "",
    acceptance.length ? `验收标准：${acceptance.join("；")}` : "",
    alignmentText,
  ).slice(0, 7);
  return items.length ? items : [fallback];
}

function formatDeliveryAcceptanceCheck(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "", 260);
  const label = item.label || item.title || item.name || item.id || "验收项";
  const ok = firstBoolean(item.ok, item.pass, item.passed, item.status);
  const detail = sanitizeMainAgentDeliveryText(item.detail || item.reason || item.summary || item.message || "", "", 160);
  const prefix = ok === true ? "通过" : ok === false ? "未通过" : "核对";
  return sanitizeMainAgentDeliveryText(`${prefix}：${label}${detail && !String(label).includes(detail) ? `（${detail}）` : ""}`, "", 260);
}

function collectDeliveryAcceptance(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus, verification: string[], risks: string[]) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const run = input.run || {};
  const gate = firstObject(
    report.acceptance_gate,
    summary.acceptance_gate,
    completion.acceptance_gate,
    workchainSummary.acceptance_gate,
    task.delivery_summary?.acceptance_gate,
  );
  const planAlignment = firstObject(
    report.plan_alignment,
    report.planAlignment,
    summary.plan_alignment,
    summary.planAlignment,
    completion.plan_alignment,
    completion.planAlignment,
    workchainSummary.plan_alignment,
    workchainSummary.planAlignment,
    task.delivery_summary?.plan_alignment,
    task.delivery_summary?.planAlignment,
  );
  const passed = firstBoolean(
    report.acceptance_gate_passed,
    report.acceptance_passed,
    summary.acceptance_gate_passed,
    summary.acceptance_passed,
    completion.acceptance_gate_passed,
    completion.acceptance_passed,
    workchainSummary.acceptance_gate_passed,
    task.delivery_summary?.acceptance_gate_passed,
    gate?.pass,
    gate?.passed,
  );
  const blockingRisk = risks.some(item => /独立复核|复核未通过|未通过|验证失败|失败验证|验证未完成|未完成验证|验证证据不足|无法确认.*验证|必需验证|缺少.*验证|验收.*缺口|仍需处理缺口|计划缺口/i.test(String(item || "")));
  const items: string[] = [];
  if (passed === true && !(status === "failed" && blockingRisk)) items.push("最终验收：已通过");
  else if (passed === true && status === "failed" && blockingRisk) items.push("最终验收：未通过，仍有待补齐项");
  else if (passed === false) items.push("最终验收：未通过，仍有待补齐项");
  else if (status === "done") items.push(verification.length && !risks.length ? "最终验收：已完成交付复核" : "最终验收：待核对验证明细");
  else if (status === "failed") items.push("最终验收：未通过，原因已整理在未完成原因里");
  else if (status === "cancelled") items.push("最终验收：任务已停止，未继续验收");
  else items.push("最终验收：仍在等待最终复核");

  const failedChecks = asArray(gate?.failed_checks || gate?.failedChecks)
    .map((item: any) => formatDeliveryAcceptanceCheck({ ...(typeof item === "object" ? item : { label: item }), ok: false }));
  const checks = asArray(gate?.checks).map(formatDeliveryAcceptanceCheck);
  const criteria = uniqueDeliveryStrings(
    report.acceptance,
    report.acceptance_criteria,
    report.acceptanceCriteria,
    summary.acceptance,
    summary.acceptance_criteria,
    summary.acceptanceCriteria,
    task.acceptance_criteria,
    task.acceptanceCriteria,
    run.acceptance_criteria,
    run.acceptanceCriteria,
  ).slice(0, 3).map(item => `验收标准：${item}`);
  const planStatus = String(planAlignment?.status || "").toLowerCase();
  const planLabel = planStatus === "aligned" ? "计划核对：已对齐"
    : ["deviated", "needs_evidence", "failed"].includes(planStatus) ? "计划核对：仍有缺口"
      : planStatus ? `计划核对：${planAlignment.status_label || planAlignment.statusLabel || planAlignment.status}` : "";
  return uniqueDeliveryStrings(
    items,
    failedChecks,
    checks,
    criteria,
    planLabel,
  ).slice(0, 8);
}

function collectDeliveryCompleted(input: MainAgentDeliveryReportInput, files: string[], verification: string[], status: MainAgentDeliveryStatus, risks: string[] = []) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  if (status !== "done") {
    const statusLine = status === "failed"
      ? "任务没有完成，我已整理未完成原因和下一步。"
      : status === "cancelled"
        ? "任务已停止，我已整理当前状态。"
        : "任务仍在处理中，我会继续跟进并在完成后总结。";
    return uniqueDeliveryStrings(
      statusLine,
      risks.slice(0, 3).map(item => status === "cancelled" ? `停止原因：${item}` : status === "failed" ? `待排查：${item}` : `待确认：${item}`),
      status === "failed" && files.length ? `已整理 ${files.length} 个文件变更，需继续修复或复核。` : "",
      status === "failed" && verification.length ? `已整理 ${verification.length} 项验证记录，需继续核对。` : "",
    ).slice(0, 6);
  }
  const headline = sanitizeMainAgentDeliveryText(
    report.headline || report.summary || report.user_text || summary.headline || summary.summary || completion.summary || input.detail || task.status_detail || workchainSummary.headline,
    "",
    500,
  );
  const evidence = uniqueDeliveryStrings(
    headline,
    report.completed,
    report.evidence,
    summary.completed,
    summary.evidence,
    completion.evidence,
    workchainSummary.evidence,
  ).filter(item => item !== headline).slice(0, 6);
  const result = [headline, ...evidence].filter(Boolean);
  if (!result.length && files.length) result.push(`已整理 ${files.length} 个文件变更。`);
  if (!result.length && verification.length) result.push(`已完成 ${verification.length} 项检查。`);
  if (result.length) return result;
  return ["交付结果已整理，是否可验收以验证详情和最终总结为准。"];
}

function collectDeliveryNextAction(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus, risks: string[], planReview: string[] = []) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const planGaps = collectDeliveryPlanReviewGaps(planReview);
  if (planGaps.length) return [`先补齐计划缺口：${planGaps[0]}`];
  const blockingRisk = risks.find(item => /完成前抽查|独立复核|复核未通过|未通过|验证失败|失败验证|验证未完成|未完成验证|验证证据不足|无法确认.*验证|必需验证|缺少.*验证|验收.*缺口|仍需处理缺口/i.test(String(item || "")));
  if (blockingRisk) {
    if (/完成前抽查/i.test(blockingRisk)) return ["先沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证；结论一致后再给出最终总结。"];
    if (/独立复核.*证据不足/i.test(blockingRisk)) return ["先补齐独立复核的命令、截图或文件复核证据；证据充分后再给出最终总结。"];
    if (/独立复核.*(未完全|无法确认|部分|待补齐)/i.test(blockingRisk)) return ["先补齐独立复核无法确认的内容；必要时让原执行成员补充后重新运行 TestAgent/独立复核，再给出最终总结。"];
    if (/独立复核|复核未通过/i.test(blockingRisk)) return ["先让原执行成员按复核意见返工；修复后重新运行 TestAgent/独立复核，再给出最终总结。"];
    if (/验证失败|失败验证|验证未完成|未完成验证|验证证据不足|无法确认.*验证|必需验证|缺少.*验证/i.test(blockingRisk)) return ["先补齐失败、未完成、缺失或不足的验证证据；验证通过后再进行最终验收。"];
    return ["先处理验收缺口或阻塞项；处理完成后我会重新验收并总结。"];
  }
  const explicit = sanitizeMainAgentDeliveryText(report.next_action || summary.next_action || completion.next_action || workchainSummary.next_action, "", 260);
  if (explicit) return [explicit];
  if (risks.length && status !== "failed" && status !== "cancelled") return ["先处理风险或缺口，我会继续跟进验收。"];
  if (status === "done") return ["可以查看改动详情，或继续补充新的要求。"];
  if (status === "failed") return ["可以根据上面的风险重新执行，或补充范围后让我继续处理。"];
  if (status === "cancelled") return ["任务已经停止；如果需要，可以重新发起新的需求。"];
  if (risks.length) return ["先处理风险或缺口，我会继续跟进验收。"];
  return ["我会继续协调执行，并在完成后给出最终交付总结。"];
}

function buildDeliverySection(id: string, title: string, items: string[], empty: string) {
  const normalized = uniqueDeliveryStrings(items).slice(0, 12);
  return { id, title, items: normalized.length ? normalized : [empty] };
}

const DELIVERY_VISIBLE_CARD_TEXT_KEYS = new Set([
  "title",
  "status_label",
  "headline",
  "current_state",
  "review_items",
  "resume_action",
  "technical_hint",
  "label",
  "value",
  "detail",
  "metrics",
  "highlights",
  "verification",
  "acceptance",
  "risks",
  "next_action",
  "primary_action",
  "primaryAction",
  "secondary_actions",
  "secondaryActions",
  "evidence",
  "unresolved",
  "items",
  "metric_value",
  "metric_detail",
  "executed",
  "failed",
  "suggested",
  "missing_required",
]);

function collectDeliveryVisibleCardText(value: any, include = false, depth = 0): string[] {
  if (depth > 8 || value === undefined || value === null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return include ? [String(value)] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => collectDeliveryVisibleCardText(item, include, depth + 1));
  }
  if (typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const visible = include || DELIVERY_VISIBLE_CARD_TEXT_KEYS.has(key);
    return collectDeliveryVisibleCardText(nested, visible, depth + 1);
  });
}

function deliveryPrimarySectionTitle(status: MainAgentDeliveryStatus) {
  if (status === "done") return "完成内容";
  if (status === "failed") return "处理结果";
  if (status === "cancelled") return "停止说明";
  return "当前进展";
}

function deliveryPrimarySectionEmpty(status: MainAgentDeliveryStatus) {
  if (status === "failed") return "任务没有完成，未完成原因已整理到风险与待确认。";
  if (status === "cancelled") return "任务已停止，没有继续执行。";
  if (status === "waiting") return "任务仍在处理中。";
  return "交付结果已整理，是否可验收以验证详情和最终总结为准。";
}

function deliveryRiskSectionEmpty(status: MainAgentDeliveryStatus) {
  if (status === "failed") return "未捕获到明确失败原因；排障信息已放入技术详情。";
  if (status === "cancelled") return "任务已停止；没有继续执行。";
  return "暂无需要你额外处理的风险。";
}

function formatDeliverySection(title: string, items: string[]) {
  return [`${title}：`, ...items.map(item => `- ${item}`)].join("\n");
}

function hasFalseDoneVisibleTextForStatus(status: MainAgentDeliveryStatus, text: string) {
  if (status === "done") return false;
  return /状态[:：]\s*已完成|任务已完成|任务交付完成|本轮处理已经完成|最终验收[:：]\s*已通过|下一步[:：]?\s*可以查看改动详情|可以查看改动详情，或继续补充新的要求/i.test(text);
}

function buildDeliveryFinalSummaryQuality(status: MainAgentDeliveryStatus, sections: any[], nextAction: string[], options: { acceptedFeedback?: string[]; visiblePayloads?: any[]; doneEvidencePresent?: boolean } = {}) {
  const requiredSections = status === "done"
    ? ["completed", "plan_review", "scope", "verification", "verification_evidence", "acceptance", "risks", "next_action"]
    : status === "waiting"
      ? ["completed", "plan_review", "risks", "next_action"]
      : ["completed", "acceptance", "risks", "next_action"];
  const sectionHasItems = (id: string) => {
    const section = sections.find(item => item?.id === id);
    return Array.isArray(section?.items) && section.items.some((item: any) => String(item || "").trim());
  };
  const checks = requiredSections.map(id => ({
    id,
    label: ({
      completed: "完成内容",
      plan_review: "计划回顾",
      scope: "涉及范围",
      verification: "验证结果",
      verification_evidence: "验收证据",
      acceptance: "验收结论",
      risks: status === "failed" ? "未完成原因" : status === "cancelled" ? "停止原因" : "风险与待确认",
      next_action: "下一步",
    } as Record<string, string>)[id] || id,
    passed: sectionHasItems(id),
  }));
  if (nextAction.length) {
    const existing = checks.find(item => item.id === "next_action");
    if (existing) existing.passed = true;
  }
  const visibleText = [
    ...sections.flatMap(section => [
      section?.title || "",
      ...(Array.isArray(section?.items) ? section.items : []),
    ]),
    ...nextAction,
  ].map(item => String(item || "")).join("\n");
  checks.push({
    id: "user_visible_protocol_sanitized",
    label: "普通文本不含内部协议",
    passed: !FINAL_SUMMARY_PROTOCOL_LEAK_PATTERN.test(visibleText),
  });
  const visibleCardText = (options.visiblePayloads || [])
    .flatMap(item => collectDeliveryVisibleCardText(item))
    .join("\n");
  checks.push({
    id: "user_visible_cards_sanitized",
    label: "交付卡普通文本不含内部协议",
    passed: !FINAL_SUMMARY_PROTOCOL_LEAK_PATTERN.test(visibleCardText),
  });
  if (status !== "done") {
    const combinedVisibleText = [visibleText, visibleCardText].filter(Boolean).join("\n");
    checks.push({
      id: "failed_status_false_done_visible",
      label: "未完成状态不含已完成口径",
      passed: !hasFalseDoneVisibleTextForStatus(status, combinedVisibleText),
    });
  } else {
    checks.push({
      id: "done_evidence_present",
      label: "完成状态有交付证据",
      passed: options.doneEvidencePresent === true,
    });
  }
  const planReviewItems = sections.find(item => item?.id === "plan_review")?.items || [];
  const planReviewText = uniqueDeliveryLines(planReviewItems).join("；");
  const acceptedFeedback = uniqueDeliveryLines(options.acceptedFeedback || []).slice(0, 2);
  if (acceptedFeedback.length) {
    checks.push({
      id: "plan_accept_feedback_visible",
      label: "确认补充要求可见",
      passed: planReviewText.includes("确认补充要求") && acceptedFeedback.every(item => planReviewText.includes(item)),
    });
  }
  const planGaps = collectDeliveryPlanReviewGaps(planReviewItems);
  if (planGaps.length) {
    const nextActionText = uniqueDeliveryLines(
      nextAction,
      sections.find(item => item?.id === "next_action")?.items || [],
    ).join("；");
    checks.push({
      id: "plan_gap_next_action",
      label: "计划缺口下一步",
      passed: nextActionText.includes("计划缺口") && nextActionText.includes(planGaps[0]),
    });
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

function hasConcreteDoneDeliveryEvidence(
  completed: string[],
  files: string[],
  verification: string[],
  verificationEvidence: any,
  independentReview: string[],
) {
  const meaningfulCompleted = uniqueDeliveryStrings(completed).some(item => !/交付结果已整理|是否可验收|任务没有完成|任务仍在处理中|任务已停止|当前状态已经整理/i.test(item));
  const verificationReady = verificationEvidence?.status === "ready"
    || Number(verificationEvidence?.executed_count || 0) > 0
    || Number(verificationEvidence?.external_runner_count || 0) > 0
    || verification.some(item => deliveryVerificationSuccessText(item) && !deliveryVerificationFailureText(item));
  return meaningfulCompleted
    || files.length > 0
    || verificationReady
    || independentReview.length > 0;
}

function buildDeliveryPickupSummary(
  input: MainAgentDeliveryReportInput,
  status: MainAgentDeliveryStatus,
  completed: string[],
  planReview: string[],
  files: string[],
  verification: string[],
  acceptance: string[],
  independentReview: string[],
  risks: string[],
  nextAction: string[],
) {
  const done = status === "done";
  const failed = status === "failed";
  const cancelled = status === "cancelled";
  const reviewItems = uniqueDeliveryStrings(
    risks.slice(0, 4).map(item => `${cancelled ? "停止原因" : "注意"}：${item}`),
    independentReview.slice(0, 2).map(item => `复核：${item}`),
    acceptance.slice(0, 2).map(item => `验收：${item}`),
    planReview.slice(0, 2).map(item => `计划：${item}`),
    files.slice(0, 2).map(item => `改动：${item}`),
    verification.slice(0, 2).map(item => `验证：${item}`),
  ).slice(0, 8);
  return {
    schema: "ccm-main-agent-pickup-summary-v1",
    title: done ? "回来继续看这里" : failed ? "恢复处理时先看这里" : cancelled ? "任务停止记录" : "当前接续提示",
    status,
    status_label: done ? "已完成" : failed ? "未完成" : cancelled ? "已停止" : "处理中",
    headline: completed[0] || (done ? "交付结果已整理，建议先核对验证和验收详情。" : failed ? "这项任务没有完成，未完成原因已整理。" : cancelled ? "这项任务已停止。" : "这项任务仍在处理中。"),
    current_state: done
      ? "可以直接查看完成内容、涉及范围和验证结果；原始执行记录在技术详情里。"
      : failed
        ? "可以从未完成原因继续处理，系统会保留已收集到的证据。"
        : cancelled
          ? "当前不会继续执行；如需推进，可以重新发起或恢复需求。"
          : "我会继续协调执行，并在完成后整理最终总结。",
    review_items: reviewItems.length ? reviewItems : [done ? "暂无额外风险需要处理。" : "暂无更多可展示的业务证据；技术细节可在技术详情中查看。"],
    resume_action: nextAction[0] || (done ? "可以继续补充新的要求。" : "可以让我继续处理。"),
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

function buildDeliveryCompletionCard(
  input: MainAgentDeliveryReportInput,
  status: MainAgentDeliveryStatus,
  completed: string[],
  files: string[],
  verification: string[],
  verificationEvidence: any,
  acceptance: string[],
  independentReview: string[],
  risks: string[],
  nextAction: string[],
) {
  const done = status === "done";
  const failed = status === "failed";
  const cancelled = status === "cancelled";
  const riskText = risks.length
    ? `${risks.length} 项`
    : done ? "暂无需要额外关注的风险" : failed ? "已整理原因" : cancelled ? "已停止" : "等待复核";
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
    headline: highlights[0] || (done ? "交付结果已整理，建议核对验证和验收详情。" : failed ? "任务没有完成，未完成原因已经整理。" : cancelled ? "任务已停止，当前状态已经整理。" : "任务仍在处理中。"),
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

function collectDeliveryPlanReviewGaps(planReview: string[]) {
  return uniqueDeliveryLines(
    planReview
      .filter(item => /^计划缺口[:：]/.test(String(item || "")))
      .map(item => String(item || "").replace(/^计划缺口[:：]\s*/, "").trim()),
  ).slice(0, 5);
}

function buildDeliveryUserHandoff(
  input: MainAgentDeliveryReportInput,
  status: MainAgentDeliveryStatus,
  completed: string[],
  planReview: string[],
  files: string[],
  verification: string[],
  acceptance: string[],
  independentReview: string[],
  risks: string[],
  nextAction: string[],
) {
  const done = status === "done";
  const failed = status === "failed";
  const cancelled = status === "cancelled";
  const actions: any[] = [];
  const planGaps = collectDeliveryPlanReviewGaps(planReview);
  const unresolvedItems = uniqueDeliveryLines(
    planGaps.map(item => `计划缺口：${item}`),
    risks,
  ).slice(0, 8);
  const primaryGap = planGaps[0] ? `计划缺口：${planGaps[0]}` : "";
  const addAction = (id: string, label: string, detail = "", kind = "", tone = "outline") => {
    if (actions.some(item => item.id === id)) return;
    actions.push({
      id,
      label: sanitizeMainAgentDeliveryText(label, "继续跟进", 80),
      detail: sanitizeMainAgentDeliveryText(detail || label, "", 220),
      kind: kind || id,
      tone,
    });
  };

  if (failed) addAction("retry_or_continue", planGaps.length ? "补齐计划缺口后继续" : "重新执行或继续修复", primaryGap || risks[0] || nextAction[0] || "我会复用已有证据继续处理。", "retry", "primary");
  else if (cancelled) addAction("restart_request", "重新发起需求", nextAction[0] || "任务已经停止；需要继续时可以重新发起。", "continue", "primary");
  else if (planGaps.length) addAction("review_plan_gaps", "先处理计划缺口", primaryGap, "gap_continue", "warning");
  else if (risks.length) addAction("review_risks", "先处理风险与待确认", risks[0], "review_risks", "warning");
  if (files.length) addAction("view_changes", "查看改动", `已整理 ${files.length} 个文件变更。`, "view_changes", done && !risks.length && !planGaps.length ? "primary" : "outline");
  if (verification.length) addAction("review_verification", "核对验证结果", `已整理 ${verification.length} 项验证记录。`, "review_delivery", actions.length ? "outline" : "primary");
  if (done) addAction("continue_request", "继续提出新要求", nextAction[0] || "如果结果符合预期，可以继续补充下一步需求。", "continue", actions.length ? "outline" : "primary");
  if (cancelled && risks.length) addAction("review_stop_reason", "查看停止原因", risks[0], "review_risks", "outline");
  if (status === "waiting") addAction("wait_for_summary", "等待最终总结", nextAction[0] || "我会继续协调执行并在完成后总结。", "continue", "outline");
  if (!actions.length) addAction("next_action", "继续跟进", nextAction[0] || "我会继续处理并更新结果。", "continue", "primary");

  const handoffStatus = failed ? "failed" : cancelled ? "cancelled" : (planGaps.length || risks.length) ? "needs_attention" : done ? "ready" : "tracking";
  const evidence = uniqueDeliveryStrings(
    planReview[0] ? `计划：${planReview[0]}` : "",
    files.length ? `改动：${files.length} 个文件` : "",
    verification.length ? `验证：${verification.length} 项已执行` : "",
    acceptance[0] ? `验收：${acceptance[0]}` : "",
    independentReview[0] ? `复核：${independentReview[0]}` : "",
    completed[0] ? `结果：${completed[0]}` : "",
    planGaps.length ? `计划缺口：${planGaps.length} 项` : "",
    risks.length ? `待确认：${risks.length} 项` : "",
  ).slice(0, 6);
  return {
    schema: "ccm-main-agent-user-handoff-v1",
    title: "接下来建议",
    surface: input.surface,
    status: handoffStatus,
    status_label: handoffStatus === "ready" ? "可验收" : handoffStatus === "failed" ? "未完成" : handoffStatus === "cancelled" ? "已停止" : handoffStatus === "needs_attention" ? "待补齐" : "跟踪中",
    headline: handoffStatus === "ready"
      ? "这轮任务已经收尾，建议先核对交付总结和改动明细。"
      : handoffStatus === "failed"
        ? planGaps.length ? "这轮任务没有完整完成，先补齐计划缺口再继续验收。" : "这轮任务没有完整完成，我已整理可以继续推进的入口。"
        : handoffStatus === "cancelled"
          ? "任务已经停止；需要继续时可以重新发起或恢复需求。"
          : handoffStatus === "needs_attention"
            ? planGaps.length ? "还有计划缺口待补齐，建议补齐后再继续。" : "还有风险或待确认项，建议先核对这些内容再继续。"
            : "任务仍在推进，我会继续整理进展和最终总结。",
    primary_action: actions[0],
    primaryAction: actions[0],
    secondary_actions: actions.slice(1, 4),
    secondaryActions: actions.slice(1, 4),
    evidence,
    unresolved: unresolvedItems,
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

function deliveryUserHandoffSectionItems(handoff: any) {
  if (!handoff) return [];
  return uniqueDeliveryStrings(
    handoff.primary_action?.label ? `${handoff.primary_action.label}${handoff.primary_action.detail ? `：${handoff.primary_action.detail}` : ""}` : "",
    ...(Array.isArray(handoff.secondary_actions) ? handoff.secondary_actions.map((item: any) => item?.label ? `${item.label}${item.detail ? `：${item.detail}` : ""}` : "") : []),
  ).slice(0, 4);
}

export function shouldShowMainAgentDeliveryReport(input: MainAgentDeliveryReportInput) {
  if (input.ordinaryConversation) return false;
  if (input.executed === true) return true;
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
  return actionEvidence.some(value => asArray(value).length > 0)
    || hasBlockingDeliveryCompletionGap(input)
    || normalizeDeliveryStatus(input.status) !== "done";
}

export function buildMainAgentDeliveryReport(input: MainAgentDeliveryReportInput) {
  const rawStatus = normalizeDeliveryStatus(input.status);
  const status = rawStatus === "done" && hasBlockingDeliveryCompletionGap(input) ? "failed" : rawStatus;
  const title = sanitizeMainAgentDeliveryText(input.title || input.task?.title || input.run?.original_user_message || input.run?.user_message || input.goal || "本轮任务", "本轮任务", 180);
  const files = collectDeliveryFiles(input);
  const verification = collectDeliveryVerification(input);
  const verificationEvidence = collectDeliveryVerificationEvidence(input, status);
  const risks = collectDeliveryRisks(input);
  const planReview = collectDeliveryPlanReview(input, status);
  const acceptance = collectDeliveryAcceptance(input, status, verification, risks);
  const independentReview = collectDeliveryIndependentReview(input, status);
  const postReviewSpotCheck = collectDeliveryPostReviewSpotCheck(input);
  const completed = collectDeliveryCompleted(input, files, verification, status, risks);
  const nextAction = collectDeliveryNextAction(input, status, risks, planReview);
  const pickupSummary = buildDeliveryPickupSummary(input, status, completed, planReview, files, verification, acceptance, independentReview, risks, nextAction);
  const completionCard = buildDeliveryCompletionCard(input, status, completed, files, verification, verificationEvidence, acceptance, independentReview, risks, nextAction);
  const userHandoff = buildDeliveryUserHandoff(input, status, completed, planReview, files, verification, acceptance, independentReview, risks, nextAction);
  const acceptedFeedbackForQuality = collectDeliveryAcceptedFeedbackForQuality(input);
  const doneEvidencePresent = status !== "done" || hasConcreteDoneDeliveryEvidence(completed, files, verification, verificationEvidence, independentReview);
  const headline = completed[0] || (status === "done" ? "交付结果已整理，是否可验收以验证详情为准。" : "任务已处理。");
  const sections = [
    buildDeliverySection("completed", deliveryPrimarySectionTitle(status), completed, deliveryPrimarySectionEmpty(status)),
    buildDeliverySection("plan_review", "计划回顾", planReview, "暂无单独计划记录；我已按交付证据整理结果。"),
    buildDeliverySection("scope", "涉及范围", files, files.length ? "" : "未检测到代码文件变更。"),
    buildDeliverySection("verification", "验证结果", verification, verification.length ? "" : "暂无系统捕获的验证命令。"),
    buildDeliverySection("verification_evidence", "验收证据", verificationEvidence.items, "验证证据仍在收集。"),
    buildDeliverySection("acceptance", "验收结论", acceptance, "我仍在等待最终复核。"),
    ...(independentReview.length ? [buildDeliverySection("independent_review", "复核结论", independentReview, "本次未触发独立复核。")] : []),
    ...(postReviewSpotCheck.length ? [buildDeliverySection("post_review_spot_check", "完成前抽查", postReviewSpotCheck, "本次未触发完成前抽查。")] : []),
    buildDeliverySection("risks", status === "failed" ? "未完成原因" : status === "cancelled" ? "停止原因" : "风险与待确认", risks, deliveryRiskSectionEmpty(status)),
    buildDeliverySection("user_handoff", "接下来建议", deliveryUserHandoffSectionItems(userHandoff), nextAction[0] || "可以继续补充新的要求。"),
    buildDeliverySection("next_action", "下一步", nextAction, "可以继续补充新的要求。"),
  ];
  const finalSummaryQuality = buildDeliveryFinalSummaryQuality(status, sections, nextAction, {
    acceptedFeedback: acceptedFeedbackForQuality,
    visiblePayloads: [completionCard, pickupSummary, userHandoff],
    doneEvidencePresent,
  });
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
    post_review_spot_check: postReviewSpotCheck,
    postReviewSpotCheck,
    post_review_spot_check_gate: input.summary?.post_review_spot_check_gate || input.completion?.post_review_spot_check_gate || null,
    postReviewSpotCheckGate: input.summary?.postReviewSpotCheckGate || input.summary?.post_review_spot_check_gate || input.completion?.postReviewSpotCheckGate || input.completion?.post_review_spot_check_gate || null,
    post_review_spot_check_summary: input.summary?.post_review_spot_check_summary || input.completion?.post_review_spot_check_summary || null,
    postReviewSpotCheckSummary: input.summary?.postReviewSpotCheckSummary || input.summary?.post_review_spot_check_summary || input.completion?.postReviewSpotCheckSummary || input.completion?.post_review_spot_check_summary || null,
    post_review_spot_check_required: input.summary?.post_review_spot_check_required === true || input.completion?.post_review_spot_check_required === true,
    post_review_spot_check_gate_passed: input.summary?.post_review_spot_check_gate_passed === true || input.completion?.post_review_spot_check_gate_passed === true,
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
    raw_report: (() => {
      const rep = input.report?.schema === "ccm-main-agent-delivery-report-v1" ? input.report.raw_report || null : input.report || null;
      if (!rep || typeof rep !== "object") return rep;
      try {
        const clean = { ...rep } as any;
        delete clean.delivery_report;
        delete clean.deliveryReport;
        delete clean.raw_report;
        delete clean.rawReport;
        return clean;
      } catch (e) {
        return null;
      }
    })(),
  };
}

export function formatMainAgentDeliveryReply(report: any) {
  if (!report) return "";
  if (report.schema === "ccm-main-agent-delivery-report-v1") return report.markdown || report.user_text || report.headline || "";
  return String(report.formatted || report.user_text || report.summary || "").trim();
}

export function runMainAgentDeliveryReportSelfTest() {
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
        accepted_feedback: "同步更新列表筛选说明",
        accepted_feedback_history: [{ feedback: "同步更新列表筛选说明", at: "2026-07-08T10:00:00.000Z" }],
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
        accepted_feedback: "上线前保留旧支付入口回滚说明",
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
  const failedReviewEvidenceShowsByPolicy = shouldShowMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "优化群聊主 Agent 任务分配",
    summary: {
      independent_review: [{
        reviewer: "TestAgent",
        verdict: "failed",
        summary: "需要返工后重新复核。",
      }],
    },
    executed: false,
  }) === true;
  const failed = buildMainAgentDeliveryReport({
    surface: "group",
    status: "failed",
    title: "修复登录",
    summary: {
      blockers: ["缺少测试环境变量"],
      next_action: "可以查看改动详情，或继续补充新的要求。",
      verification_failed: ["npm test -- --run login 失败"],
      verification_suggested: ["建议补跑 npm run e2e:login"],
      verification_required_missing: [{ agent: "web", required: ["npm run test:login"] }],
      verification_required_gate_passed: false,
      verification_source_gate_passed: false,
      acceptance_gate_passed: false,
      acceptance_gate: { failed_checks: [{ id: "verify", label: "测试环境变量齐全" }] },
      plan_mode: {
        title: "登录修复执行计划",
        steps: [{ content: "修复登录恢复逻辑" }, { content: "运行登录验证" }],
        acceptance: ["登录恢复验证通过"],
      },
      plan_alignment: {
        status: "needs_evidence",
        status_label: "1 项待补",
        deviations: [{
          id: "criterion_1",
          label: "登录恢复验证通过",
          reason: "还没有系统捕获 npm run test:login 的通过记录",
        }],
      },
    },
    executed: true,
  });
  const failedIndependentReviewDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "重构登录守卫",
    summary: {
      headline: "登录守卫重构已提交，但独立复核未通过。",
      next_action: "可以查看改动详情，或继续补充新的要求。",
      actual_file_changes: [{ project: "web", path: "src/auth/guard.ts", additions: 24, deletions: 9 }],
      verification_executed: ["npm run check"],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: false,
      acceptance_gate: { failed_checks: [{ id: "review", label: "独立复核通过" }] },
      independent_review_required: true,
      independent_review_gate_passed: false,
      independent_review_gate: {
        status: "failed",
        reason: "TestAgent 发现登录失败路径没有覆盖。",
        evidence: [{
          reviewer: "TestAgent",
          verdict: "failed",
          summary: "缺少失败路径验证，需要原执行成员补测试并修复。",
          evidence: ["npm run check"],
        }],
      },
    },
    executed: true,
  });
  const failedIndependentReviewEvidenceOnlyDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "优化群聊主 Agent 任务分配",
    summary: {
      headline: "任务分配逻辑已调整，但 TestAgent 复核要求返工。",
      next_action: "可以查看改动详情，或继续补充新的要求。",
      actual_file_changes: [{ project: "backend", path: "backend/modules/collaboration/group-orchestrator.ts", additions: 16, deletions: 3 }],
      verification_executed: ["npm run check"],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "dispatch_summary", label: "任务分配摘要可读", ok: true }] },
      independent_review: [{
        reviewer: "TestAgent",
        verdict: "failed",
        summary: "发现返工项：执行成员失败后没有重新分派复核，需要原执行成员修复后再复核。",
        evidence: ["review: group orchestration failure path"],
      }],
    },
    executed: true,
  });
  const failedVerificationResultDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "调整任务卡验证展示",
    summary: {
      headline: "任务卡验证展示已调整，但验证命令失败。",
      next_action: "可以查看改动详情，或继续补充新的要求。",
      actual_file_changes: [{ project: "frontend", path: "frontend/src/components/tasks/TaskExperienceCard.vue", additions: 12, deletions: 4 }],
      verification_results: [{
        command: "npm run test:render-regression",
        status: "failed",
        summary: "截图断言失败，需要修复后重新验证。",
        exitCode: 1,
      }],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "visible_verification", label: "验证展示可读", ok: true }] },
    },
    executed: true,
  });
  const partialIndependentReviewDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "重构消息展示",
    summary: {
      headline: "消息展示已调整，但独立复核只完成了部分范围。",
      actual_file_changes: [{ project: "frontend", path: "frontend/src/components/collaboration/GroupChat.vue", additions: 10, deletions: 2 }],
      verification_executed: ["npm run check"],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
      independent_review: [{
        reviewer: "TestAgent",
        verdict: "partial",
        summary: "列表渲染已看过，但移动端折叠态无法验证，需要补一张移动端截图。",
      }],
    },
    executed: true,
  });
  const weakPassedIndependentReviewDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "优化代码变更抽屉",
    summary: {
      headline: "代码变更抽屉已调整，独立复核声称通过但没有附带可核对证据。",
      actual_file_changes: [{ project: "frontend", path: "frontend/src/components/collaboration/GroupChat.vue", additions: 9, deletions: 2 }],
      verification_executed: ["npm run check"],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
      independent_review_required: true,
      independent_review_gate_passed: true,
      independent_review: [{
        reviewer: "TestAgent",
        verdict: "passed",
        summary: "看起来没有明显问题。",
      }],
    },
    executed: true,
  });
  const incompleteVerificationResultDone = buildMainAgentDeliveryReport({
    surface: "global",
    status: "done",
    title: "完善全局任务摘要",
    summary: {
      headline: "全局任务摘要已调整，但关键验证未执行。",
      actual_file_changes: [{ project: "backend", path: "backend/modules/global/global-agent.ts", additions: 8, deletions: 1 }],
      verification_results: [{
        command: "npm run test:render-regression",
        status: "skipped",
        summary: "本轮没有运行截图回归，仍需补跑。",
      }],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
    },
    executed: true,
  });
  const noVerificationEvidenceDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "调整群聊任务卡样式",
    summary: {
      headline: "群聊任务卡样式已调整。",
      actual_file_changes: [{ project: "frontend", path: "frontend/src/components/tasks/TaskExperienceCard.vue", additions: 7, deletions: 2 }],
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "style_update", label: "样式调整完成", ok: true }] },
    },
    executed: true,
  });
  const passedPostReviewSpotCheckDone = buildMainAgentDeliveryReport({
    surface: "group",
    status: "done",
    title: "完成登录恢复交付",
    summary: {
      headline: "登录恢复交付已经完成。",
      actual_file_changes: [{ project: "web", path: "src/session.ts", additions: 8, deletions: 2 }],
      verification_executed: ["npm test"],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "login", label: "登录恢复可用", ok: true }] },
      independent_review_required: true,
      independent_review_gate_passed: true,
      independent_review_gate: {
        required: true,
        pass: true,
        status: "passed",
        evidence: [{ reviewer: "TestAgent", verdict: "passed", summary: "TestAgent 已通过独立复核。", evidence: ["npm test"] }],
      },
      post_review_spot_check_required: true,
      post_review_spot_check_gate_passed: true,
      post_review_spot_check_gate: {
        required: true,
        pass: true,
        status: "passed",
        reason: "TestAgent 通过后，我已完成关键验证抽查",
      },
      post_review_spot_check_summary: {
        schema: "ccm-main-agent-post-review-spot-check-summary-v1",
        title: "完成前抽查",
        status: "passed",
        status_label: "已通过",
        headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
        rows: ["已抽查 2 项验证，2 项结果一致"],
        next_action: "继续完成最终验收。",
      },
    },
    executed: true,
  });
  const failedPostReviewSpotCheckDone = buildMainAgentDeliveryReport({
    surface: "global",
    status: "done",
    title: "完成登录恢复交付",
    summary: {
      headline: "登录恢复交付已提交，但完成前抽查尚未一致。",
      next_action: "可以查看改动详情，或继续补充新的要求。",
      actual_file_changes: [{ project: "web", path: "src/session.ts", additions: 8, deletions: 2 }],
      verification_executed: ["npm test"],
      verification_required_gate_passed: true,
      verification_source_gate_passed: true,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "login", label: "登录恢复可用", ok: true }] },
      independent_review_required: true,
      independent_review_gate_passed: true,
      independent_review_gate: {
        required: true,
        pass: true,
        status: "passed",
        evidence: [{ reviewer: "TestAgent", verdict: "passed", summary: "TestAgent 已通过独立复核。", evidence: ["npm test"] }],
      },
      post_review_spot_check_required: true,
      post_review_spot_check_gate_passed: false,
      post_review_spot_check_gate: {
        required: true,
        pass: false,
        status: "needs_recheck",
        reason: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
      },
      post_review_spot_check_summary: {
        schema: "ccm-main-agent-post-review-spot-check-summary-v1",
        title: "完成前抽查",
        status: "needs_recheck",
        status_label: "需复验",
        headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
        rows: ["已抽查 2 项验证，1 项结果一致，1 项不一致"],
        next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
      },
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
  const bareDone = buildMainAgentDeliveryReport({
    surface: "global",
    status: "done",
    title: "整理空白交付",
    executed: true,
  });
  const structuredLeakQuality = buildDeliveryFinalSummaryQuality("done", [
    buildDeliverySection("completed", "完成内容", ["已完成"], "已完成"),
    buildDeliverySection("plan_review", "计划回顾", ["已按计划完成"], "已按计划完成"),
    buildDeliverySection("scope", "涉及范围", ["src/App.vue"], "src/App.vue"),
    buildDeliverySection("verification", "验证结果", ["npm test"], "npm test"),
    buildDeliverySection("verification_evidence", "验收证据", ["已实际执行 1 项验证：npm test"], "已实际执行 1 项验证"),
    buildDeliverySection("acceptance", "验收结论", ["最终验收：已通过"], "最终验收：已通过"),
    buildDeliverySection("risks", "风险与待确认", ["暂无需要你额外处理的风险。"], "暂无需要你额外处理的风险。"),
    buildDeliverySection("next_action", "下一步", ["可以继续补充新的要求。"], "可以继续补充新的要求。"),
  ], ["可以继续补充新的要求。"], {
    visiblePayloads: [{
      title: "最终交付总览",
      headline: "trace_id raw payload should stay out of visible cards",
      metrics: [{ label: "状态", value: "已完成" }],
    }],
  });
  const falseDoneFailedQuality = buildDeliveryFinalSummaryQuality("failed", [
    buildDeliverySection("completed", "处理结果", ["任务已完成，结果可以查看。"], "任务没有完成"),
    buildDeliverySection("acceptance", "验收结论", ["最终验收：已通过"], "最终验收：未通过"),
    buildDeliverySection("risks", "未完成原因", ["仍有验证缺口"], "仍有验证缺口"),
    buildDeliverySection("next_action", "下一步", ["可以查看改动详情，或继续补充新的要求。"], "继续处理"),
  ], ["可以查看改动详情，或继续补充新的要求。"], {
    visiblePayloads: [{
      title: "未完成总览",
      headline: "任务已完成",
      metrics: [{ label: "状态", value: "已完成" }],
    }],
  });
  const formattedGroup = formatMainAgentDeliveryReply(group);
  const protectedFailureCopy = sanitizeMainAgentDeliveryText("CCM_AGENT_RECEIPT failed raw payload trace_id=hidden denied");
  const checks = {
    protectedFailureCopyUsesInvestigationLanguage: protectedFailureCopy.includes("我会继续定位")
      && protectedFailureCopy.includes("技术详情")
      && !protectedFailureCopy.includes("需要处理")
      && !INTERNAL_DELIVERY_TEXT_PATTERN.test(protectedFailureCopy),
    groupHasFriendlySections: group.markdown.includes("完成内容") && group.markdown.includes("计划回顾") && group.markdown.includes("验证结果") && group.markdown.includes("验收证据") && group.markdown.includes("验收结论") && group.markdown.includes("下一步"),
    groupKeepsFilesReadable: group.files.some(file => file.includes("src/Tickets.vue")),
    groupHasPlanReview: group.plan_review?.some((item: string) => item.includes("执行前计划"))
      && group.markdown.includes("计划步骤")
      && group.markdown.includes("计划核对：已对齐")
      && group.pickup_summary?.review_items?.some((item: string) => item.includes("计划：")),
    groupPlanReviewIncludesAcceptedFeedback: group.plan_review?.some((item: string) => item.includes("确认补充要求") && item.includes("同步更新列表筛选说明"))
      && group.markdown.includes("确认补充要求：同步更新列表筛选说明"),
    globalPlanReviewIncludesAcceptedFeedback: global.plan_review?.some((item: string) => item.includes("确认补充要求") && item.includes("上线前保留旧支付入口回滚说明"))
      && global.markdown.includes("确认补充要求：上线前保留旧支付入口回滚说明"),
    groupFinalSummaryQualityRequiresAcceptedFeedback: group.final_summary_quality?.passed === true
      && group.final_summary_quality?.checks?.some((item: any) => item.id === "plan_accept_feedback_visible" && item.passed === true && item.label === "确认补充要求可见"),
    globalFinalSummaryQualityRequiresAcceptedFeedback: global.final_summary_quality?.passed === true
      && global.final_summary_quality?.checks?.some((item: any) => item.id === "plan_accept_feedback_visible" && item.passed === true && item.label === "确认补充要求可见"),
    groupHasAcceptanceConclusion: group.acceptance?.some((item: string) => item.includes("已通过"))
      && group.markdown.includes("最终验收")
      && group.completion_card?.metrics?.some((item: any) => item.id === "acceptance" && item.value === "已通过"),
    groupHasVerificationEvidenceQuality: group.verification_evidence?.schema === "ccm-main-agent-verification-evidence-v1"
      && group.verification_evidence?.items?.some((item: string) => item.includes("已实际执行 1 项验证"))
      && group.verification_evidence?.items?.some((item: string) => item.includes("外部 Runner 证据 1 项"))
      && group.completion_card?.metrics?.some((item: any) => item.id === "verification" && item.value.includes("实际执行"))
      && group.markdown.includes("验收证据"),
    groupHasCompletionCard: group.completion_card?.schema === "ccm-main-agent-completion-card-v1" && group.completion_card?.metrics?.some((item: any) => item.id === "verification" && item.value.includes("1")),
    groupHasFinalSummaryQualityGate: group.final_summary_quality?.schema === "ccm-main-agent-final-summary-quality-v1" && group.final_summary_quality?.passed === true,
    finalSummaryQualityRequiresVisibleProtocolSanitizer: group.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_protocol_sanitized" && item.passed === true)
      && failed.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_protocol_sanitized" && item.passed === true)
      && legacy.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_protocol_sanitized" && item.passed === true),
    finalSummaryQualityRequiresVisibleCardSanitizer: group.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_cards_sanitized" && item.passed === true)
      && failed.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_cards_sanitized" && item.passed === true)
      && legacy.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_cards_sanitized" && item.passed === true),
    visibleCardQualityGateCatchesProtocolLeaks: structuredLeakQuality.passed === false
      && structuredLeakQuality.checks?.some((item: any) => item.id === "user_visible_cards_sanitized" && item.passed === false && item.label === "交付卡普通文本不含内部协议"),
    finalSummaryQualityCatchesFalseDoneForFailedStatus: falseDoneFailedQuality.passed === false
      && falseDoneFailedQuality.checks?.some((item: any) => item.id === "failed_status_false_done_visible" && item.passed === false && item.label === "未完成状态不含已完成口径"),
    formattedDeliveryReplyHasRequiredSections: formattedGroup.includes("完成内容") && formattedGroup.includes("验证结果") && formattedGroup.includes("验收证据") && formattedGroup.includes("验收结论") && formattedGroup.includes("下一步"),
    groupHasPickupSummary: group.pickup_summary?.schema === "ccm-main-agent-pickup-summary-v1" && group.pickup_summary?.review_items?.some((item: string) => item.includes("src/Tickets.vue")) && group.pickup_summary?.review_items?.some((item: string) => item.includes("验收")) && group.pickup_summary?.technical_hint?.includes("技术详情"),
    groupHasUserHandoff: group.user_handoff?.schema === "ccm-main-agent-user-handoff-v1"
      && group.user_handoff?.primary_action?.kind === "view_changes"
      && group.markdown.includes("接下来建议"),
    globalShowsRiskAndNextAction: global.markdown.includes("生产密钥") && global.next_action.length > 0,
    globalCompletionCardShowsRisk: global.completion_card?.risks?.some((item: string) => item.includes("生产密钥")) && global.completion_card?.technical_hint?.includes("技术详情"),
    globalPickupShowsRisk: global.pickup_summary?.review_items?.some((item: string) => item.includes("生产密钥")) && global.pickup_summary?.resume_action?.length > 0,
    globalHasIndependentReviewConclusion: global.independent_review?.some((item: string) => item.includes("已通过"))
      && global.independent_review?.some((item: string) => item.includes("qa-agent"))
      && global.markdown.includes("复核结论")
      && global.pickup_summary?.review_items?.some((item: string) => item.includes("复核：")),
    globalHandoffPrioritizesRisk: global.user_handoff?.status === "needs_attention"
      && global.user_handoff?.primary_action?.kind === "review_risks"
      && global.user_handoff?.unresolved?.some((item: string) => item.includes("生产密钥")),
    ordinaryConversationHiddenByPolicy: ordinaryShouldHide,
    failedReviewEvidenceShowsByPolicy,
    failedReportHasRisk: failed.markdown.includes("未完成原因") && failed.markdown.includes("缺少测试环境变量") && failed.markdown.includes("验收结论") && failed.markdown.includes("未通过") && failed.status === "failed"
      && failed.markdown.includes("验收证据")
      && failed.verification_evidence?.items?.some((item: string) => item.includes("失败验证"))
      && failed.verification_evidence?.items?.some((item: string) => item.includes("项目必需验证缺口"))
      && failed.user_handoff?.primary_action?.kind === "retry",
    failedPlanReviewShowsGapDetail: failed.markdown.includes("计划缺口：登录恢复验证通过")
      && failed.markdown.includes("还没有系统捕获 npm run test:login 的通过记录")
      && failed.markdown.includes("计划核对：仍有缺口")
      && !failed.markdown.includes("criterion_1"),
    failedHandoffPrioritizesPlanGap: failed.user_handoff?.primary_action?.label === "补齐计划缺口后继续"
      && failed.user_handoff?.primary_action?.detail?.includes("计划缺口：登录恢复验证通过")
      && failed.user_handoff?.headline?.includes("先补齐计划缺口")
      && failed.user_handoff?.unresolved?.some((item: string) => item.includes("计划缺口：登录恢复验证通过"))
      && failed.user_handoff?.evidence?.some((item: string) => item.includes("计划缺口")),
    failedNextActionPrioritizesPlanGap: failed.next_action?.includes("先补齐计划缺口：登录恢复验证通过")
      && failed.pickup_summary?.resume_action?.includes("先补齐计划缺口：登录恢复验证通过")
      && failed.completion_card?.next_action?.includes("先补齐计划缺口：登录恢复验证通过")
      && failed.markdown.includes("下一步：\n- 先补齐计划缺口：登录恢复验证通过"),
    explicitNextActionCannotOverridePlanGap: failed.next_action?.includes("先补齐计划缺口")
      && !failed.markdown.includes("下一步：\n- 可以查看改动详情"),
    doneWithFailedIndependentReviewPrioritizesRework: failedIndependentReviewDone.status === "failed"
      && failedIndependentReviewDone.status_label === "未完成"
      && failedIndependentReviewDone.markdown.includes("状态：未完成")
      && failedIndependentReviewDone.independent_review?.some((item: string) => item.includes("未通过"))
      && failedIndependentReviewDone.risks?.some((item: string) => item.includes("独立复核"))
      && failedIndependentReviewDone.next_action?.includes("重新运行 TestAgent")
      && failedIndependentReviewDone.pickup_summary?.resume_action?.includes("重新运行 TestAgent")
      && failedIndependentReviewDone.completion_card?.next_action?.includes("重新运行 TestAgent")
      && failedIndependentReviewDone.completion_card?.metrics?.some((item: any) => item.id === "status" && item.value === "未完成")
      && failedIndependentReviewDone.markdown.includes("下一步：\n- 先让原执行成员按复核意见返工")
      && !failedIndependentReviewDone.markdown.includes("状态：已完成")
      && !failedIndependentReviewDone.markdown.includes("下一步：\n- 可以查看改动详情"),
    explicitNextActionCannotOverrideFailedReview: failedIndependentReviewDone.next_action?.includes("重新运行 TestAgent")
      && !failedIndependentReviewDone.markdown.includes("下一步：\n- 可以查看改动详情"),
    failedIndependentReviewEvidenceOnlyDonePrioritizesRework: failedIndependentReviewEvidenceOnlyDone.status === "failed"
      && failedIndependentReviewEvidenceOnlyDone.status_label === "未完成"
      && failedIndependentReviewEvidenceOnlyDone.markdown.includes("状态：未完成")
      && failedIndependentReviewEvidenceOnlyDone.independent_review?.some((item: string) => item.includes("未通过"))
      && failedIndependentReviewEvidenceOnlyDone.risks?.some((item: string) => item.includes("独立复核未通过"))
      && failedIndependentReviewEvidenceOnlyDone.next_action?.includes("重新运行 TestAgent")
      && failedIndependentReviewEvidenceOnlyDone.pickup_summary?.resume_action?.includes("重新运行 TestAgent")
      && failedIndependentReviewEvidenceOnlyDone.completion_card?.next_action?.includes("重新运行 TestAgent")
      && failedIndependentReviewEvidenceOnlyDone.completion_card?.metrics?.some((item: any) => item.id === "status" && item.value === "未完成")
      && failedIndependentReviewEvidenceOnlyDone.markdown.includes("下一步：\n- 先让原执行成员按复核意见返工")
      && !failedIndependentReviewEvidenceOnlyDone.markdown.includes("状态：已完成")
      && !failedIndependentReviewEvidenceOnlyDone.markdown.includes("下一步：\n- 可以查看改动详情"),
    failedVerificationResultDoneBlocksCompletion: failedVerificationResultDone.status === "failed"
      && failedVerificationResultDone.status_label === "未完成"
      && failedVerificationResultDone.markdown.includes("状态：未完成")
      && failedVerificationResultDone.verification_evidence?.failed_count > 0
      && failedVerificationResultDone.verification_evidence?.items?.some((item: string) => item.includes("失败验证"))
      && failedVerificationResultDone.risks?.some((item: string) => item.includes("验证失败"))
      && failedVerificationResultDone.acceptance?.some((item: string) => item.includes("未通过"))
      && failedVerificationResultDone.next_action?.includes("补齐失败、未完成、缺失或不足的验证证据")
      && failedVerificationResultDone.completion_card?.metrics?.some((item: any) => item.id === "status" && item.value === "未完成")
      && failedVerificationResultDone.markdown.includes("下一步：\n- 先补齐失败、未完成、缺失或不足的验证证据")
      && !failedVerificationResultDone.markdown.includes("状态：已完成")
      && !failedVerificationResultDone.markdown.includes("下一步：\n- 可以查看改动详情"),
    failedDeliveryPrimarySummaryAvoidsOptimisticHeadline: failedVerificationResultDone.headline?.includes("任务没有完成")
      && failedVerificationResultDone.sections?.find((item: any) => item.id === "completed")?.items?.[0]?.includes("任务没有完成")
      && !failedVerificationResultDone.sections?.find((item: any) => item.id === "completed")?.items?.[0]?.includes("已调整"),
    partialIndependentReviewDoneBlocksCompletion: partialIndependentReviewDone.status === "failed"
      && partialIndependentReviewDone.status_label === "未完成"
      && partialIndependentReviewDone.markdown.includes("状态：未完成")
      && partialIndependentReviewDone.independent_review?.some((item: string) => item.includes("部分完成"))
      && partialIndependentReviewDone.risks?.some((item: string) => item.includes("独立复核未完全确认"))
      && partialIndependentReviewDone.next_action?.includes("补齐独立复核无法确认的内容")
      && !partialIndependentReviewDone.markdown.includes("状态：已完成"),
    weakPassedIndependentReviewDoneBlocksCompletion: weakPassedIndependentReviewDone.status === "failed"
      && weakPassedIndependentReviewDone.status_label === "未完成"
      && weakPassedIndependentReviewDone.markdown.includes("状态：未完成")
      && weakPassedIndependentReviewDone.independent_review?.some((item: string) => item.includes("证据仍需补齐"))
      && weakPassedIndependentReviewDone.risks?.some((item: string) => item.includes("独立复核证据不足"))
      && weakPassedIndependentReviewDone.next_action?.includes("补齐独立复核的命令")
      && weakPassedIndependentReviewDone.completion_card?.metrics?.some((item: any) => item.id === "status" && item.value === "未完成")
      && !weakPassedIndependentReviewDone.markdown.includes("状态：已完成"),
    weakPassedReviewPrimarySummaryAvoidsOptimisticHeadline: weakPassedIndependentReviewDone.headline?.includes("任务没有完成")
      && weakPassedIndependentReviewDone.sections?.find((item: any) => item.id === "completed")?.items?.[0]?.includes("任务没有完成")
      && !weakPassedIndependentReviewDone.sections?.find((item: any) => item.id === "completed")?.items?.[0]?.includes("已调整"),
    incompleteVerificationResultDoneBlocksCompletion: incompleteVerificationResultDone.status === "failed"
      && incompleteVerificationResultDone.status_label === "未完成"
      && incompleteVerificationResultDone.markdown.includes("状态：未完成")
      && incompleteVerificationResultDone.verification_evidence?.incomplete_count > 0
      && incompleteVerificationResultDone.verification_evidence?.items?.some((item: string) => item.includes("未完成验证"))
      && incompleteVerificationResultDone.risks?.some((item: string) => item.includes("验证未完成"))
      && incompleteVerificationResultDone.next_action?.includes("补齐失败、未完成、缺失或不足的验证证据")
      && !incompleteVerificationResultDone.markdown.includes("状态：已完成"),
    noVerificationEvidenceDoneBlocksCompletion: noVerificationEvidenceDone.status === "failed"
      && noVerificationEvidenceDone.status_label === "未完成"
      && noVerificationEvidenceDone.markdown.includes("状态：未完成")
      && noVerificationEvidenceDone.verification_evidence?.weak_missing_count > 0
      && noVerificationEvidenceDone.verification_evidence?.items?.some((item: string) => item.includes("验证证据不足"))
      && noVerificationEvidenceDone.risks?.some((item: string) => item.includes("验证证据不足"))
      && noVerificationEvidenceDone.acceptance?.some((item: string) => item.includes("未通过"))
      && noVerificationEvidenceDone.next_action?.includes("补齐失败、未完成、缺失或不足的验证证据")
      && noVerificationEvidenceDone.headline?.includes("任务没有完成")
      && !noVerificationEvidenceDone.markdown.includes("状态：已完成"),
    passedPostReviewSpotCheckAllowsCompletion: passedPostReviewSpotCheckDone.status === "done"
      && passedPostReviewSpotCheckDone.post_review_spot_check?.some((item: string) => item.includes("2 项结果一致"))
      && passedPostReviewSpotCheckDone.markdown.includes("完成前抽查")
      && passedPostReviewSpotCheckDone.markdown.includes("状态：已完成")
      && !passedPostReviewSpotCheckDone.markdown.includes("主 Agent"),
    failedPostReviewSpotCheckDoneBlocksCompletion: failedPostReviewSpotCheckDone.status === "failed"
      && failedPostReviewSpotCheckDone.status_label === "未完成"
      && failedPostReviewSpotCheckDone.post_review_spot_check?.some((item: string) => item.includes("1 项不一致"))
      && failedPostReviewSpotCheckDone.risks?.some((item: string) => item.includes("完成前抽查尚未通过"))
      && failedPostReviewSpotCheckDone.next_action?.includes("沿用原复核工作单重新运行 TestAgent")
      && failedPostReviewSpotCheckDone.pickup_summary?.resume_action?.includes("沿用原复核工作单重新运行 TestAgent")
      && failedPostReviewSpotCheckDone.completion_card?.next_action?.includes("沿用原复核工作单重新运行 TestAgent")
      && failedPostReviewSpotCheckDone.markdown.includes("状态：未完成")
      && !failedPostReviewSpotCheckDone.markdown.includes("状态：已完成")
      && !failedPostReviewSpotCheckDone.markdown.includes("主 Agent"),
    bareDoneQualityRequiresEvidence: bareDone.status === "done"
      && bareDone.final_summary_quality?.passed === false
      && bareDone.final_summary_quality?.checks?.some((item: any) => item.id === "done_evidence_present" && item.passed === false)
      && bareDone.headline?.includes("是否可验收")
      && bareDone.sections?.find((item: any) => item.id === "completed")?.items?.[0]?.includes("是否可验收")
      && bareDone.completion_card?.headline?.includes("是否可验收")
      && !bareDone.completion_card?.headline?.includes("任务已完成"),
    failedFinalSummaryQualityRequiresPlanGapNextAction: failed.final_summary_quality?.passed === true
      && failed.final_summary_quality?.checks?.some((item: any) => item.id === "plan_gap_next_action" && item.passed === true && item.label === "计划缺口下一步"),
    cancelledReportHasStopSummary: cancelled.markdown.includes("停止说明")
      && cancelled.markdown.includes("停止原因")
      && !cancelled.markdown.includes("风险与待确认")
      && cancelled.completion_card?.metrics?.some((item: any) => item.id === "risk" && item.label === "停止原因")
      && cancelled.pickup_summary?.review_items?.some((item: string) => item.includes("停止原因"))
      && cancelled.status === "cancelled" && cancelled.status_label === "已取消"
      && cancelled.user_handoff?.status === "cancelled"
      && cancelled.user_handoff?.primary_action?.kind === "continue",
    legacyProtocolTextSanitized: !INTERNAL_DELIVERY_TEXT_PATTERN.test(legacy.markdown) && legacy.markdown.includes("结果说明") && !legacy.markdown.includes("raw payload"),
    noInternalLeak: !INTERNAL_DELIVERY_TEXT_PATTERN.test(group.markdown) && !INTERNAL_DELIVERY_TEXT_PATTERN.test(global.markdown),
  };
  return { pass: Object.values(checks).every(Boolean), checks, group, global, failed, cancelled, legacy, bareDone, structuredLeakQuality, falseDoneFailedQuality, failedIndependentReviewEvidenceOnlyDone, failedVerificationResultDone, partialIndependentReviewDone, weakPassedIndependentReviewDone, incompleteVerificationResultDone, noVerificationEvidenceDone, passedPostReviewSpotCheckDone, failedPostReviewSpotCheckDone };
}

