import {
  sanitizeMainAgentRoleLanguage,
  sanitizeUserFacingProtocolTerms,
  sanitizeUserFacingTerminology,
} from "./user-facing-text";

const INTERNAL_DELIVERY_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease|workchain/i;
const FINAL_SUMMARY_PROTOCOL_LEAK_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease/i;

export type MainAgentDeliverySurface = "group" | "global";
export type MainAgentDeliveryStatus = "done" | "waiting" | "failed" | "cancelled";

export interface MainAgentDeliveryReportInput {
  surface: MainAgentDeliverySurface;
  status?: any;
  title?: any;
  goal?: any;
  detail?: any;
  task?: any;
  run?: any;
  summary?: any;
  report?: any;
  completion?: any;
  workchain?: any;
  technical?: any;
  executed?: boolean;
  ordinaryConversation?: boolean;
}

function compactDeliveryText(value: any, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function sanitizeDeliveryUserTerminology(value: string) {
  return sanitizeMainAgentRoleLanguage(
    sanitizeUserFacingProtocolTerms(
      sanitizeUserFacingTerminology(value),
    ),
  );
}

export function sanitizeMainAgentDeliveryText(value: any, fallback = "处理结果已整理，是否可验收以验证详情为准。", max = 260) {
  let text = compactDeliveryText(value, max);
  if (!text) text = fallback;
  if (INTERNAL_DELIVERY_TEXT_PATTERN.test(text)) {
    if (/error|失败|denied|invalid|权限|门禁/i.test(text)) text = "执行过程中遇到需要处理的问题，排障信息已放入技术详情。";
    else if (/done|完成|receipt|回执/i.test(text)) text = "执行成员已提交结果说明，我已完成汇总。";
    else text = fallback;
  }
  return compactDeliveryText(sanitizeDeliveryUserTerminology(text
    .replace(/\bCoordinator\b/g, "我")
    .replace(/\bPipeline\b/g, "协作看板")
    .replace(/\bRuntime Kernel\b/g, "技术运行信息")
    .replace(/\bTrace Replay\b/g, "技术回放")), max);
}

function splitDeliveryValues(value: any): string[] {
  if (Array.isArray(value)) return value.flatMap(splitDeliveryValues);
  if (value && typeof value === "object") {
    if (value.label || value.summary || value.reason || value.command || value.path || value.file || value.title) {
      return [formatDeliveryObject(value)].filter(Boolean);
    }
    return [];
  }
  const text = String(value || "").trim();
  if (!text || ["无", "暂无", "未提供", "未填写", "null", "undefined"].includes(text)) return [];
  return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}

function uniqueDeliveryStrings(...lists: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const raw of splitDeliveryValues(list)) {
      const value = sanitizeMainAgentDeliveryText(raw, "", 360);
      if (!value || seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function flattenDeliveryLineValues(value: any): any[] {
  if (Array.isArray(value)) return value.flatMap(flattenDeliveryLineValues);
  if (value === undefined || value === null) return [];
  if (value && typeof value === "object") return [formatDeliveryObject(value)].filter(Boolean);
  const text = String(value || "").trim();
  if (!text || ["无", "暂无", "未提供", "未填写", "null", "undefined"].includes(text)) return [];
  return [text];
}

function uniqueDeliveryLines(...lists: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const raw of flattenDeliveryLineValues(list)) {
      const value = sanitizeMainAgentDeliveryText(raw, "", 520);
      if (!value || seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function asArray(value: any) {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function firstObject(...values: any[]) {
  return values.find(value => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function firstBoolean(...values: any[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    const text = String(value ?? "").trim().toLowerCase();
    if (["true", "passed", "pass", "ok", "success", "yes"].includes(text)) return true;
    if (["false", "failed", "fail", "no"].includes(text)) return false;
  }
  return null;
}

function formatDeliveryObject(item: any) {
  if (!item || typeof item !== "object") return String(item || "").trim();
  if (item.path || item.file || item.name) return formatDeliveryFileItem(item);
  if (item.command || item.result || item.status || item.summary) {
    const command = item.command || item.name || "";
    const result = item.result || item.statusText || item.status || item.summary || "";
    return compactDeliveryText([command, result].filter(Boolean).join(" - "), 360);
  }
  return compactDeliveryText(item.label || item.title || item.reason || item.detail || "", 360);
}

export function formatDeliveryFileItem(item: any) {
  if (!item || typeof item === "string") return sanitizeMainAgentDeliveryText(item, "", 320);
  const pathText = item.path || item.file || item.name || "";
  if (!pathText) return "";
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

function normalizeDeliveryStatus(status: any): MainAgentDeliveryStatus {
  const value = String(status || "").toLowerCase();
  if (["done", "completed", "succeeded", "success", "ok"].includes(value)) return "done";
  if (["failed", "error", "rejected"].includes(value)) return "failed";
  if (["cancelled", "canceled", "stopped"].includes(value)) return "cancelled";
  return "waiting";
}

function hasBlockingDeliveryCompletionGap(input: MainAgentDeliveryReportInput) {
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
  const independentReviewRequired = firstBoolean(
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
  const independentReviewPassed = firstBoolean(
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
  const gateStatus = String(gate?.status || "").toLowerCase();
  const acceptancePassed = firstBoolean(
    report.acceptance_gate_passed,
    report.acceptance_passed,
    summary.acceptance_gate_passed,
    summary.acceptance_passed,
    completion.acceptance_gate_passed,
    completion.acceptance_passed,
    workchainSummary.acceptance_gate_passed,
    workchainSummary.acceptance_passed,
    task.delivery_summary?.acceptance_gate_passed,
    task.delivery_summary?.acceptance_passed,
  );
  const verificationRequiredPassed = firstBoolean(
    report.verification_required_gate_passed,
    summary.verification_required_gate_passed,
    completion.verification_required_gate_passed,
    workchainSummary.verification_required_gate_passed,
  );
  const verificationSourcePassed = firstBoolean(
    report.verification_source_gate_passed,
    summary.verification_source_gate_passed,
    completion.verification_source_gate_passed,
    workchainSummary.verification_source_gate_passed,
  );
  const failedVerification = uniqueDeliveryStrings(
    report.verification_failed,
    report.failed_verification,
    summary.verification_failed,
    summary.failed_verification,
    completion.verification_failed,
    workchainSummary.verification_failed,
  );
  const failedVerificationEvidence = collectFailedDeliveryVerificationEvidence(input);
  const incompleteVerificationEvidence = collectIncompleteDeliveryVerificationEvidence(input);
  const weakVerificationEvidence = collectWeakMissingDeliveryVerificationEvidence(input);
  const missingVerification = uniqueDeliveryStrings(
    asArray(report.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(summary.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(completion.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(workchainSummary.verification_required_missing).map(formatDeliveryMissingVerification),
  );
  const planStatus = String(
    report.plan_alignment?.status
      || report.planAlignment?.status
      || summary.plan_alignment?.status
      || summary.planAlignment?.status
      || completion.plan_alignment?.status
      || completion.planAlignment?.status
      || workchainSummary.plan_alignment?.status
      || workchainSummary.planAlignment?.status
      || "",
  ).toLowerCase();
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
    || /failed|rejected|blocked/i.test(gateStatus)
    || ["deviated", "needs_evidence", "failed"].includes(planStatus);
}

function deliveryStatusLabel(status: MainAgentDeliveryStatus) {
  if (status === "done") return "已完成";
  if (status === "failed") return "未完成";
  if (status === "cancelled") return "已取消";
  return "继续处理中";
}

function deliveryTitle(status: MainAgentDeliveryStatus) {
  if (status === "done") return "任务交付完成";
  if (status === "failed") return "任务执行失败";
  if (status === "cancelled") return "任务已取消";
  return "任务需要继续处理";
}

function getNestedReport(input: MainAgentDeliveryReportInput) {
  const report = input.report?.schema === "ccm-main-agent-delivery-report-v1"
    ? input.report.raw_report || {}
    : input.report || {};
  const summary = input.summary || {};
  const completion = input.completion || {};
  const workchainSummary = input.workchain?.completion_summary || {};
  return { report, summary, completion, workchainSummary };
}

function collectDeliveryFiles(input: MainAgentDeliveryReportInput) {
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
    if (value?.files && Array.isArray(value.files)) return value.files;
    return asArray(value);
  });
  const seen = new Set<string>();
  return flattened.map(formatDeliveryFileItem).filter(item => {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  }).slice(0, 16);
}

function collectDeliveryVerification(input: MainAgentDeliveryReportInput) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  return uniqueDeliveryStrings(
    report.verification_executed,
    report.verification_results,
    report.verification,
    report.checks,
    report.delivery?.verification,
    summary.verification_executed,
    summary.verification_results,
    summary.verification,
    summary.checks,
    task.receipt?.verification,
    completion.verification,
    completion.evidence,
    workchainSummary.verification,
  ).slice(0, 12);
}

function firstDeliveryNumber(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }
  return null;
}

function formatDeliveryMissingVerification(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "未提供项目验证命令执行证据", 260);
  const agent = sanitizeMainAgentDeliveryText(item.agent || item.project || item.target || "未知 Agent", "未知 Agent", 80);
  const required = uniqueDeliveryStrings(item.required, item.commands, item.command, item.expected).slice(0, 3);
  const reason = sanitizeMainAgentDeliveryText(item.reason || item.detail || "", "", 160);
  return sanitizeMainAgentDeliveryText(`${agent}：${required.length ? required.join(" / ") : "未提供项目验证命令执行证据"}${reason ? `（${reason}）` : ""}`, "", 320);
}

function collectRawDeliveryVerificationEvidence(input: MainAgentDeliveryReportInput) {
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

function deliveryVerificationFailureText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  if (/未通过|验证失败|测试失败|执行失败|命令失败|报错|错误/i.test(text)) return true;
  if (/无失败|未发现.*失败|没有.*失败|0\s*项?失败/i.test(text)) return false;
  if (/\b(failed|failure|error|errored|non[-_\s]?zero|exit code [1-9]\d*|exit_code [1-9]\d*|exitCode [1-9]\d*)\b/i.test(lower)
    && !/\b(no|not|without|zero|0)\s+(failed|failures|errors?)\b/i.test(lower)) return true;
  if (/失败/i.test(text)) return true;
  return false;
}

function deliveryVerificationSuccessText(value: any) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return ["passed", "pass", "success", "succeeded", "ok", "done", "complete", "completed"].includes(text)
    || /通过|成功|无失败|未发现.*失败|没有.*失败|no failed|no failures|0 failed|0 failures|exit code 0|exit_code 0/i.test(text);
}

function deliveryVerificationIncompleteText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  if (/无法验证|未验证|未执行|未运行|跳过|仅部分|部分通过|部分完成|待验证|待补跑|待补齐|证据不足|无法确认|未覆盖|缺失验证|需要补跑|需补跑/i.test(text)) return true;
  if (/\b(partial|incomplete|inconclusive|unable[_\s-]?to[_\s-]?verify|not[_\s-]?verified|not[_\s-]?run|not[_\s-]?executed|skipped|pending|todo)\b/i.test(lower)) return true;
  return false;
}

function formatDeliveryVerificationFailureEvidence(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "验证失败", 320);
  const command = sanitizeMainAgentDeliveryText(item.command || item.cmd || item.name || item.label || item.title || "", "", 160);
  const status = sanitizeMainAgentDeliveryText(item.status || item.result || item.outcome || item.verdict || item.state || "", "", 80);
  const detail = sanitizeMainAgentDeliveryText(item.summary || item.message || item.error || item.stderr || item.detail || item.reason || "", "", 220);
  const exitCode = item.exitCode ?? item.exit_code ?? item.code;
  const exitText = exitCode !== undefined && exitCode !== null && exitCode !== "" ? `退出码 ${exitCode}` : "";
  return sanitizeMainAgentDeliveryText([command, status, exitText, detail].filter(Boolean).join(" - "), "验证失败", 360);
}

function formatDeliveryVerificationIncompleteEvidence(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "验证未完成", 320);
  const command = sanitizeMainAgentDeliveryText(item.command || item.cmd || item.name || item.label || item.title || "", "", 160);
  const status = sanitizeMainAgentDeliveryText(item.status || item.result || item.outcome || item.verdict || item.state || "", "", 80);
  const detail = sanitizeMainAgentDeliveryText(item.summary || item.message || item.detail || item.reason || item.note || "", "", 220);
  return sanitizeMainAgentDeliveryText([command, status, detail].filter(Boolean).join(" - "), "验证未完成", 360);
}

function deliveryVerificationFailureSummary(item: any) {
  if (!item) return "";
  if (typeof item !== "object") {
    return deliveryVerificationFailureText(item) ? sanitizeMainAgentDeliveryText(item, "验证失败", 320) : "";
  }
  const booleanVerdict = firstBoolean(item.ok, item.pass, item.passed, item.success, item.status, item.result, item.outcome, item.verdict, item.state);
  if (booleanVerdict === false) return formatDeliveryVerificationFailureEvidence(item);
  if (booleanVerdict === true) return "";
  const exitCode = item.exitCode ?? item.exit_code ?? item.code;
  if (exitCode !== undefined && exitCode !== null && exitCode !== "" && Number(exitCode) !== 0 && Number.isFinite(Number(exitCode))) {
    return formatDeliveryVerificationFailureEvidence(item);
  }
  const failedCount = firstDeliveryNumber(item.failed_count, item.failedCount, item.failures, item.errors, item.error_count, item.errorCount);
  if (failedCount !== null && failedCount > 0) return formatDeliveryVerificationFailureEvidence(item);
  const statusText = [item.status, item.result, item.outcome, item.verdict, item.state, item.conclusion].filter(Boolean).join(" ");
  if (statusText && deliveryVerificationSuccessText(statusText)) return "";
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

function deliveryVerificationIncompleteSummary(item: any) {
  if (!item) return "";
  if (typeof item !== "object") {
    return deliveryVerificationIncompleteText(item) && !deliveryVerificationFailureText(item)
      ? sanitizeMainAgentDeliveryText(item, "验证未完成", 320)
      : "";
  }
  if (deliveryVerificationFailureSummary(item)) return "";
  const booleanVerdict = firstBoolean(item.ok, item.pass, item.passed, item.success, item.status, item.result, item.outcome, item.verdict, item.state);
  if (booleanVerdict === true) return "";
  const statusText = [item.status, item.result, item.outcome, item.verdict, item.state, item.conclusion].filter(Boolean).join(" ");
  if (statusText && deliveryVerificationSuccessText(statusText)) return "";
  if (deliveryVerificationIncompleteText(statusText)) return formatDeliveryVerificationIncompleteEvidence(item);
  const skipped = firstBoolean(item.skipped, item.skip, item.not_run, item.notRun, item.not_executed, item.notExecuted);
  if (skipped === true) return formatDeliveryVerificationIncompleteEvidence(item);
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

function collectFailedDeliveryVerificationEvidence(input: MainAgentDeliveryReportInput) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  return uniqueDeliveryLines(
    report.verification_failed,
    report.failed_verification,
    summary.verification_failed,
    summary.failed_verification,
    completion.verification_failed,
    workchainSummary.verification_failed,
    collectRawDeliveryVerificationEvidence(input).map(deliveryVerificationFailureSummary),
  ).slice(0, 8);
}

function collectIncompleteDeliveryVerificationEvidence(input: MainAgentDeliveryReportInput) {
  return uniqueDeliveryLines(
    collectRawDeliveryVerificationEvidence(input).map(deliveryVerificationIncompleteSummary),
  ).slice(0, 8);
}

function collectWeakMissingDeliveryVerificationEvidence(input: MainAgentDeliveryReportInput) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const files = collectDeliveryFiles(input);
  if (!files.length) return [];
  const executedExplicit = uniqueDeliveryStrings(
    report.verification_executed,
    report.executed_verification,
    summary.verification_executed,
    summary.executed_verification,
    completion.verification_executed,
    workchainSummary.verification_executed,
  );
  const externalRunnerEvidence = uniqueDeliveryStrings(
    report.external_runner_verification,
    summary.external_runner_verification,
    completion.external_runner_verification,
    workchainSummary.external_runner_verification,
  );
  const recordedResults = uniqueDeliveryStrings(collectRawDeliveryVerificationEvidence(input));
  const sourceGatePassed = firstBoolean(
    report.verification_source_gate_passed,
    summary.verification_source_gate_passed,
    completion.verification_source_gate_passed,
    workchainSummary.verification_source_gate_passed,
  );
  const externalRunnerCount = firstDeliveryNumber(
    report.external_runner_verification_count,
    summary.external_runner_verification_count,
    completion.external_runner_verification_count,
    workchainSummary.external_runner_verification_count,
  ) ?? externalRunnerEvidence.length;
  const failed = collectFailedDeliveryVerificationEvidence(input);
  const incomplete = collectIncompleteDeliveryVerificationEvidence(input);
  const missingRequired = uniqueDeliveryStrings(
    asArray(report.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(summary.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(completion.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(workchainSummary.verification_required_missing).map(formatDeliveryMissingVerification),
  );
  if (
    executedExplicit.length
    || externalRunnerEvidence.length
    || recordedResults.length
    || externalRunnerCount > 0
    || sourceGatePassed === true
    || failed.length
    || incomplete.length
    || missingRequired.length
  ) return [];
  return [`已整理 ${files.length} 个文件变更，但没有系统捕获到实际验证证据。`];
}

function collectDeliveryVerificationEvidence(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus) {
  const { report, summary, completion, workchainSummary } = getNestedReport(input);
  const task = input.task || {};
  const executedExplicit = uniqueDeliveryStrings(
    report.verification_executed,
    report.executed_verification,
    summary.verification_executed,
    summary.executed_verification,
    completion.verification_executed,
    workchainSummary.verification_executed,
  );
  const externalRunnerEvidence = uniqueDeliveryStrings(
    report.external_runner_verification,
    summary.external_runner_verification,
    completion.external_runner_verification,
    workchainSummary.external_runner_verification,
  );
  const recordedResults = uniqueDeliveryStrings(
    report.verification_results,
    summary.verification_results,
    report.verification,
    summary.verification,
    report.checks,
    summary.checks,
    report.delivery?.verification,
    task.receipt?.verification,
    completion.verification,
    completion.evidence,
    workchainSummary.verification,
  );
  const executed = uniqueDeliveryStrings(
    executedExplicit,
    externalRunnerEvidence,
    executedExplicit.length || externalRunnerEvidence.length ? [] : recordedResults,
  ).slice(0, 12);
  const failed = collectFailedDeliveryVerificationEvidence(input);
  const incomplete = collectIncompleteDeliveryVerificationEvidence(input);
  const weakMissing = collectWeakMissingDeliveryVerificationEvidence(input);
  const suggested = uniqueDeliveryStrings(
    report.verification_suggested,
    report.suggested_verification,
    report.verification_recommended,
    summary.verification_suggested,
    summary.suggested_verification,
    summary.verification_recommended,
    completion.verification_suggested,
    workchainSummary.verification_suggested,
  ).slice(0, 8);
  const missingRequired = uniqueDeliveryStrings(
    asArray(report.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(summary.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(completion.verification_required_missing).map(formatDeliveryMissingVerification),
    asArray(workchainSummary.verification_required_missing).map(formatDeliveryMissingVerification),
  ).slice(0, 8);
  const requiredGatePassed = firstBoolean(
    report.verification_required_gate_passed,
    summary.verification_required_gate_passed,
    completion.verification_required_gate_passed,
    workchainSummary.verification_required_gate_passed,
  );
  const sourceGatePassed = firstBoolean(
    report.verification_source_gate_passed,
    summary.verification_source_gate_passed,
    completion.verification_source_gate_passed,
    workchainSummary.verification_source_gate_passed,
  );
  const externalRunnerCount = firstDeliveryNumber(
    report.external_runner_verification_count,
    summary.external_runner_verification_count,
    completion.external_runner_verification_count,
    workchainSummary.external_runner_verification_count,
  ) ?? externalRunnerEvidence.length;
  const items: string[] = [];
  if (executed.length) {
    const label = executedExplicit.length || externalRunnerEvidence.length ? "已实际执行" : "已记录验证结果";
    items.push(`${label} ${executed.length} 项验证：${executed.slice(0, 3).join("；")}`);
  }
  if (failed.length) items.push(`失败验证 ${failed.length} 项：${failed.slice(0, 3).join("；")}`);
  if (incomplete.length) items.push(`未完成验证 ${incomplete.length} 项：${incomplete.slice(0, 3).join("；")}`);
  if (weakMissing.length) items.push(`验证证据不足：${weakMissing.slice(0, 3).join("；")}`);
  if (suggested.length) items.push(`仅建议/未执行验证 ${suggested.length} 项：${suggested.slice(0, 3).join("；")}；这些不算完成证据。`);
  if (missingRequired.length) items.push(`项目必需验证缺口 ${missingRequired.length} 项：${missingRequired.slice(0, 3).join("；")}`);
  else if (requiredGatePassed === true) items.push("项目配置要求的验证命令：已覆盖。");
  else if (requiredGatePassed === false) items.push("项目配置要求的验证命令：未覆盖，仍需补跑。");
  if (externalRunnerCount > 0) items.push(`外部 Runner 证据 ${externalRunnerCount} 项：验证来源已记录。`);
  else if (sourceGatePassed === true) items.push("验证来源：已通过外部 Runner 口径。");
  else if (sourceGatePassed === false) items.push("外部 Runner 证据缺失：当前不能只凭执行成员自述判定完成。");
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

function deliveryIndependentReviewLabel(value: any) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (/无阻塞|无高风险|未发现.*(阻塞|风险)|没有.*(阻塞|风险)/.test(text)) return "已通过";
  if (["failed", "fail", "rejected", "reject", "blocked", "block", "needs_rework", "changes_requested"].includes(text) || /未通过|失败|拒绝|阻塞|需要返工|需返工/.test(text)) return "未通过";
  if (["passed", "pass", "approved", "approve", "success", "ok", "done", "complete", "completed"].includes(text) || /已通过|通过|批准|无阻塞|无高风险|未发现.*(阻塞|风险)|没有.*(阻塞|风险)/.test(text)) return "已通过";
  if (/风险/.test(text)) return "未通过";
  if (["partial", "incomplete", "inconclusive", "unable_to_verify", "unable-to-verify", "skipped"].includes(text) || /部分|无法验证|无法确认|未验证|未完成|跳过|证据不足/.test(text)) return "待补齐";
  if (["missing", "pending", "waiting", "required"].includes(text) || /待|缺|等待/.test(text)) return "待补齐";
  if (["not_required", "not-required", "none"].includes(text)) return "未触发";
  return sanitizeMainAgentDeliveryText(value, "已记录", 80);
}

function collectRawDeliveryIndependentReviewEvidence(input: MainAgentDeliveryReportInput) {
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

function deliveryIndependentReviewFailureText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  const normalized = lower.replace(/\s+/g, " ").replace(/-/g, "_");
  if (/未通过|复核失败|审核失败|验证失败|拒绝|需要返工|需返工|要求返工|不能通过|未满足/i.test(text)) return true;
  if (["failed", "fail", "rejected", "reject", "blocked", "block", "needs_rework", "need_rework", "changes_requested"].includes(normalized)) return true;
  if (/\b(needs[_\s-]?rework|changes requested|rejected|blocked)\b/i.test(lower)) return true;
  if (/未发现.*(阻塞|失败|风险)|没有.*(阻塞|失败|风险)|无阻塞|无高风险|no blocking|no blockers|no failed|without blocking/i.test(text)) return false;
  if (/失败|阻塞/i.test(text)) return true;
  if (/\bfailed?\b/i.test(lower) && !/\b(no|not|without|zero|0)\s+failed?\b/i.test(lower)) return true;
  return false;
}

function deliveryIndependentReviewIncompleteText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (deliveryIndependentReviewFailureText(text)) return false;
  if (/部分|无法验证|无法确认|未验证|未完成|跳过|证据不足|待补齐|待确认/i.test(text)) return true;
  if (/\b(partial|incomplete|inconclusive|unable[_\s-]?to[_\s-]?verify|not[_\s-]?verified|skipped|pending)\b/i.test(text)) return true;
  return false;
}

function deliveryIndependentReviewFailureSummary(item: any) {
  if (!item) return "";
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

function collectFailedIndependentReviewEvidence(input: MainAgentDeliveryReportInput) {
  return uniqueDeliveryLines(
    collectRawDeliveryIndependentReviewEvidence(input).map(deliveryIndependentReviewFailureSummary),
  ).slice(0, 4);
}

function deliveryIndependentReviewIncompleteSummary(item: any) {
  if (!item) return "";
  if (typeof item !== "object") {
    return deliveryIndependentReviewIncompleteText(item) ? sanitizeMainAgentDeliveryText(item, "独立复核仍有无法确认的内容", 260) : "";
  }
  if (deliveryIndependentReviewFailureSummary(item)) return "";
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
  if (deliveryIndependentReviewLabel(verdict) === "已通过") return "";
  if (deliveryIndependentReviewIncompleteText(verdict)) return formatDeliveryIndependentReviewEvidence(item);
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

function collectIncompleteIndependentReviewEvidence(input: MainAgentDeliveryReportInput) {
  return uniqueDeliveryLines(
    collectRawDeliveryIndependentReviewEvidence(input).map(deliveryIndependentReviewIncompleteSummary),
  ).slice(0, 4);
}

function independentReviewEvidenceHasSupport(item: any) {
  if (!item || typeof item !== "object") return false;
  const evidenceCount = firstDeliveryNumber(
    item.evidence_count,
    item.evidenceCount,
    item.command_count,
    item.commandCount,
    item.check_count,
    item.checkCount,
    item.file_count,
    item.fileCount,
  );
  if (evidenceCount !== null && evidenceCount > 0) return true;
  const support = uniqueDeliveryStrings(
    item.evidence,
    item.checks,
    item.findings,
    item.filesReviewed,
    item.files_reviewed,
    item.files,
    item.commands,
    item.command,
    item.verification,
    item.verification_results,
    item.verificationResults,
    item.artifacts,
    item.screenshots,
    item.outputs,
    item.command_output,
    item.commandOutput,
  );
  if (support.length > 0) return true;
  const summary = String(item.summary || item.note || item.comment || item.message || item.detail || "").trim();
  return /\b(npm|pnpm|yarn|vitest|jest|pytest|playwright|tsc|eslint|cargo|go test|mvn|gradle)\b|命令|截图|复核文件|测试输出|验证输出/i.test(summary);
}

function deliveryIndependentReviewWeakPassSummary(item: any) {
  if (!item) return "";
  if (typeof item !== "object") {
    const label = deliveryIndependentReviewLabel(item);
    return label === "已通过" ? sanitizeMainAgentDeliveryText(item, "独立复核通过证据不足", 260) : "";
  }
  if (deliveryIndependentReviewFailureSummary(item) || deliveryIndependentReviewIncompleteSummary(item)) return "";
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
  if (deliveryIndependentReviewLabel(verdict) !== "已通过") return "";
  return independentReviewEvidenceHasSupport(item) ? "" : formatDeliveryIndependentReviewEvidence(item);
}

function collectWeakPassedIndependentReviewEvidence(input: MainAgentDeliveryReportInput) {
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
  const rawEvidence = collectRawDeliveryIndependentReviewEvidence(input);
  const weakRows = uniqueDeliveryLines(rawEvidence.map(deliveryIndependentReviewWeakPassSummary));
  const gateEvidenceCount = firstDeliveryNumber(gate?.evidence_count, gate?.evidenceCount);
  const gateClaimsPassWithoutEvidence = (required === true || passed === true)
    && passed === true
    && (!rawEvidence.length || gateEvidenceCount === 0);
  return uniqueDeliveryLines(
    weakRows,
    gateClaimsPassWithoutEvidence ? "独立复核标记为已通过，但缺少可核对的复核证据。" : "",
  ).slice(0, 4);
}

function formatDeliveryIndependentReviewEvidence(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "", 260);
  const reviewer = sanitizeMainAgentDeliveryText(item.reviewer || item.agent || item.by || item.reviewedBy || item.reviewed_by || "", "", 80);
  const verdict = deliveryIndependentReviewLabel(item.verdict || item.status || item.result || "");
  const summary = sanitizeMainAgentDeliveryText(item.summary || item.note || item.comment || item.message || "", "", 220);
  const evidence = uniqueDeliveryStrings(item.evidence, item.checks, item.findings, item.filesReviewed, item.files_reviewed).slice(0, 2).join("；");
  const core = [verdict, summary].filter(Boolean).join(" - ") || evidence || "独立复核已记录";
  return sanitizeMainAgentDeliveryText(`${reviewer ? `${reviewer}：` : ""}${core}`, "", 320);
}

function collectDeliveryIndependentReview(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus) {
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
    ? "独立复核：未通过，仍需处理复核意见"
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

function collectDeliveryRisks(input: MainAgentDeliveryReportInput) {
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
    task.receipt?.blockers,
    task.receipt?.needs,
    completion.risks,
    workchainSummary.risks,
    failedChecks,
  ).slice(0, 10);
}

function deliveryPlanStepText(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "", 180);
  return sanitizeMainAgentDeliveryText(item.content || item.subject || item.title || item.label || item.summary || item.activeForm || item.active_form || "", "", 180);
}

function deliveryPlanAcceptedFeedbackText(item: any) {
  if (!item || typeof item !== "object") return sanitizeMainAgentDeliveryText(item, "", 260);
  return sanitizeMainAgentDeliveryText(item.feedback || item.text || item.message || item.detail || item.summary || item.content || "", "", 260);
}

function collectDeliveryPlanAcceptedFeedback(input: MainAgentDeliveryReportInput, plan: any) {
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

function collectDeliveryAcceptedFeedbackForQuality(input: MainAgentDeliveryReportInput) {
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

function collectDeliveryPlanAlignmentGaps(planAlignment: any) {
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
  const prefix = ok === true ? "通过" : ok === false ? "待处理" : "核对";
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
  else if (passed === true && status === "failed" && blockingRisk) items.push("最终验收：未通过，仍需处理缺口");
  else if (passed === false) items.push("最终验收：未通过，仍需处理缺口");
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
      risks.slice(0, 3).map(item => status === "cancelled" ? `停止原因：${item}` : `待处理：${item}`),
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
  const blockingRisk = risks.find(item => /独立复核|复核未通过|未通过|验证失败|失败验证|验证未完成|未完成验证|验证证据不足|无法确认.*验证|必需验证|缺少.*验证|验收.*缺口|仍需处理缺口/i.test(String(item || "")));
  if (blockingRisk) {
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
    status_label: handoffStatus === "ready" ? "可验收" : handoffStatus === "failed" ? "未完成" : handoffStatus === "cancelled" ? "已停止" : handoffStatus === "needs_attention" ? "需处理" : "跟踪中",
    headline: handoffStatus === "ready"
      ? "这轮任务已经收尾，建议先核对交付总结和改动明细。"
      : handoffStatus === "failed"
        ? planGaps.length ? "这轮任务没有完整完成，先补齐计划缺口再继续验收。" : "这轮任务没有完整完成，我已整理可以继续推进的入口。"
        : handoffStatus === "cancelled"
          ? "任务已经停止；需要继续时可以重新发起或恢复需求。"
          : handoffStatus === "needs_attention"
            ? planGaps.length ? "还有计划缺口需要处理，建议先补齐这些内容再继续。" : "还有风险或待确认项，建议先处理这些内容再继续。"
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
  const checks = {
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
  return { pass: Object.values(checks).every(Boolean), checks, group, global, failed, cancelled, legacy, bareDone, structuredLeakQuality, falseDoneFailedQuality, failedIndependentReviewEvidenceOnlyDone, failedVerificationResultDone, partialIndependentReviewDone, weakPassedIndependentReviewDone, incompleteVerificationResultDone, noVerificationEvidenceDone };
}
