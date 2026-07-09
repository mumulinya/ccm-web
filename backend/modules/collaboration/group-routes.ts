import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson, GROUP_MESSAGES_DIR } from "../../core/utils";
import { loadTasks } from "../../core/db";
import {
  appendGroupMessage,
  getGroupMessages,
  loadGroups,
  saveGroupMessages,
  saveGroups,
} from "./storage";
import { loadGroupLogs, saveGroupLogs } from "./logs";
import { getCoordinatorMember, normalizeGroupOrchestrator } from "./group-orchestrator";
import { buildToolAuthorizationPayload, normalizeToolAuthorization, recordToolAuthorizationChange } from "../../tools/tool-authorization";
import { sanitizeMainAgentDeliveryText } from "../../agents/delivery-report";

type BasicGroupRouteDeps = {
  getGroupMemoryFile: (groupId: string) => string;
  loadGroupMemory: (groupId: string) => any;
  saveGroupMemory: (groupId: string, memory: any) => any;
  buildGroupMemoryContext: (memory: any) => string;
  buildAgentMemoryPacket: (groupId: string, project: string) => string;
  buildInlineTaskRuntime: (task: any) => any;
  getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
};

const GROUP_MAIN_AGENT_PROGRESS_REFRESH_STALE_MS = 15 * 60 * 1000;

function compactGroupStatusText(value: any, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function taskUpdatedMs(task: any) {
  return Date.parse(task?.updated_at || task?.completed_at || task?.created_at || "") || 0;
}

function groupProgressTimeMs(...values: any[]) {
  const times = values
    .map(value => Date.parse(String(value || "")))
    .filter(value => Number.isFinite(value) && value > 0);
  return times.length ? Math.max(...times) : 0;
}

function groupProgressAgeLabel(ageMs: number) {
  if (!Number.isFinite(ageMs) || ageMs <= 0) return "";
  const minutes = Math.max(1, Math.round(ageMs / 60_000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.max(1, Math.round(minutes / 60));
  if (hours < 24) return `${hours} 小时`;
  return `${Math.max(1, Math.round(hours / 24))} 天`;
}

function checkpointStatus(status: any) {
  const value = String(status || "").toLowerCase();
  if (["done", "completed", "ok", "success", "succeeded"].includes(value)) return "done";
  if (["active", "running", "in_progress", "reviewing", "reworking"].includes(value)) return "active";
  if (["warn", "warning", "blocked", "needs_confirmation", "cancelled", "canceled", "stopped"].includes(value)) return "warning";
  if (["fail", "failed", "error"].includes(value)) return "failed";
  return "pending";
}

function groupTaskStatusMeta(status: any) {
  const value = String(status || "").toLowerCase();
  if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(value)) {
    return { phase: "completed", label: "已完成", terminal: true, deliveryStatus: "done", checkpointStatus: "done" };
  }
  if (["failed", "fail", "error", "rejected"].includes(value)) {
    return { phase: "failed", label: "未完成", terminal: true, deliveryStatus: "failed", checkpointStatus: "failed" };
  }
  if (["cancelled", "canceled", "stopped"].includes(value)) {
    return { phase: "cancelled", label: "已取消", terminal: true, deliveryStatus: "cancelled", checkpointStatus: "warning" };
  }
  if (["reworking", "needs_rework", "retrying", "repairing"].includes(value)) return { phase: "reworking", label: "返工中", terminal: false, deliveryStatus: "active", checkpointStatus: "active" };
  if (["blocked", "needs_attention", "partial", "missing_receipt", "needs_info"].includes(value)) return { phase: "needs_user", label: "待补齐", terminal: false, deliveryStatus: "active", checkpointStatus: "warning" };
  if (["reviewing", "review", "verifying"].includes(value)) return { phase: "reviewing", label: "验收中", terminal: false, deliveryStatus: "active", checkpointStatus: "active" };
  if (["waiting_user", "needs_user", "needs_confirmation"].includes(value)) return { phase: "needs_user", label: "等待你确认", terminal: false, deliveryStatus: "active", checkpointStatus: "warning" };
  if (["pending", "queued"].includes(value)) return { phase: value || "queued", label: "排队中", terminal: false, deliveryStatus: "active", checkpointStatus: "pending" };
  if (["in_progress", "running", "executing", "active"].includes(value)) return { phase: "executing", label: "正在处理", terminal: false, deliveryStatus: "active", checkpointStatus: "active" };
  return { phase: value || "idle", label: value ? "正在处理" : "空闲", terminal: false, deliveryStatus: "active", checkpointStatus: value ? "active" : "pending" };
}

function groupDeliveryStatusLabel(status: any) {
  if (status === "done") return "已完成";
  if (status === "failed") return "未完成";
  if (status === "cancelled") return "已取消";
  return "继续处理中";
}

function groupDeliveryCheckpointLabel(status: any) {
  if (status === "done") return "任务交付完成";
  if (status === "failed") return "任务未完成，已整理原因";
  if (status === "cancelled") return "任务已取消，已整理状态";
  return "已整理阶段总结";
}

function countGroupStatusItems(...values: any[]) {
  let count = 0;
  for (const value of values) {
    if (Array.isArray(value)) count = Math.max(count, value.length);
    else if (Number.isFinite(Number(value))) count = Math.max(count, Number(value));
  }
  return count;
}

function flattenGroupAcceptanceRows(...values: any[]) {
  const rows: any[] = [];
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value === "object" && !value.summary && !value.detail && !value.reason && !value.label && !value.verdict && !value.status) {
      if (Array.isArray(value.items)) {
        for (const item of value.items) visit(item);
        return;
      }
      if (Array.isArray(value.evidence)) {
        for (const item of value.evidence) visit(item);
        return;
      }
    }
    rows.push(value);
  };
  for (const value of values) visit(value);
  return rows;
}

function groupEvidenceText(row: any) {
  if (!row || typeof row !== "object") return String(row || "");
  return [row.summary, row.detail, row.reason, row.message, row.label, row.title, row.verdict, row.status].filter(Boolean).join(" ");
}

function isPositiveGroupAcceptanceText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/未通过|失败|待补|待处理|缺口|证据不足|无法确认|无法验证|failed|failure|partial|incomplete|missing|blocked/i.test(text)) return false;
  return /已通过|通过|可以接受|已覆盖|已执行|已复核|已验证|passed|pass|success|ok/i.test(text);
}

function isBareGroupAcceptanceMarker(value: any) {
  return /^(最终验收|主\s*Agent\s*验收|验收结论)\s*[：:]?\s*(已通过|通过)$/i.test(String(value || "").trim());
}

function isStrongGroupVerificationText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|失败|未通过|报错|错误|failed|failure|error|not\s+run|not\s+executed|suggest/i.test(text)) return false;
  return /已实际执行|已执行|外部 Runner|验证来源|命令|npm|pnpm|yarn|test|check|lint|build|playwright|pytest|exit\s*0|passed|success|ok/i.test(text);
}

function groupHasStrongAcceptanceEvidence(task: any, summary: any = {}, latestCard: any = null) {
  if (latestCard?.delivery?.acceptance_passed === true) return true;
  if (latestCard?.acceptance_review?.pass === true || latestCard?.acceptanceReview?.pass === true) return true;
  if (latestCard?.mainAgentDecision?.verify?.passed === true || latestCard?.main_agent_decision?.verify?.passed === true) return true;

  const report = summary?.delivery_report || summary?.deliveryReport || null;
  const gate = summary?.acceptance_gate || {};
  const gatePass = summary?.acceptance_gate_passed === true || gate?.pass === true || report?.status === "done";
  if (!gatePass) return false;

  const gateChecks = Array.isArray(gate?.checks) ? gate.checks : (Array.isArray(gate?.items) ? gate.items : []);
  const failedCount = Number(gate?.failed_count || gate?.failedCount || gateChecks.filter((item: any) => item?.ok === false || item?.pass === false).length || 0);
  const substantiveGateIds = new Set(["actual_changes", "actual_diff", "verification", "required_verification", "verification_source", "independent_review", "final_review", "worker_receipt", "receipt_quality", "work_items", "team_shutdown"]);
  if (gateChecks.length > 0
    && failedCount === 0
    && gateChecks.every((item: any) => item?.ok !== false && item?.pass !== false)
    && gateChecks.some((item: any) => substantiveGateIds.has(String(item?.id || "")))) {
    return true;
  }

  const verificationRows = flattenGroupAcceptanceRows(
    summary?.verification_executed,
    summary?.external_runner_verification,
    summary?.verification_results,
    summary?.verification,
    report?.verification,
    report?.verification_evidence?.executed,
    report?.verificationEvidence?.executed,
    report?.verification_evidence?.items,
    report?.verificationEvidence?.items,
    task?.verification,
    task?.verification_results,
  );
  if (verificationRows.some(isStrongGroupVerificationText)) return true;
  if (summary?.verification_source_gate_passed === true && Number(summary?.external_runner_verification_count || 0) > 0) return true;

  const reviewRows = flattenGroupAcceptanceRows(
    summary?.independent_review,
    summary?.independentReview,
    summary?.independent_review_evidence,
    summary?.independent_review_gate?.evidence,
    report?.independent_review,
    report?.independentReview,
  );
  if (summary?.independent_review_gate_passed === true && Number(summary?.independent_review_gate?.evidence_count || reviewRows.length || 0) > 0) return true;
  if (reviewRows.some((row: any) => isPositiveGroupAcceptanceText(groupEvidenceText(row)) && !isBareGroupAcceptanceMarker(groupEvidenceText(row)))) return true;

  const acceptanceRows = flattenGroupAcceptanceRows(
    summary?.acceptance,
    summary?.acceptance_evidence,
    summary?.acceptanceEvidence,
    report?.acceptance,
    report?.acceptance_evidence,
    report?.acceptanceEvidence,
  );
  return acceptanceRows.some((row: any) => {
    const text = groupEvidenceText(row);
    return isPositiveGroupAcceptanceText(text) && !isBareGroupAcceptanceMarker(text);
  });
}

function groupTaskDisplayStatus(task: any, summary: any = {}, latestCard: any = null, rawStatus: any = "") {
  const value = String(rawStatus || "").toLowerCase();
  if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(value)
    && !groupHasStrongAcceptanceEvidence(task, summary, latestCard)) {
    return latestCard?.phase || "reviewing";
  }
  return rawStatus;
}

function friendlyGroupCompletionText(value: any, fallback: string, max = 220) {
  const text = compactGroupStatusText(value, max);
  const fallbackText = sanitizeMainAgentDeliveryText(fallback, fallback, max);
  if (!text) return fallbackText;
  if (/CCM_AGENT_RECEIPT|trace[_-]?id|session[_-]?id|run[_-]?id|workflow_timeline|runtime kernel|raw_report|stack/i.test(text)) {
    return sanitizeMainAgentDeliveryText(text, fallbackText, max);
  }
  return sanitizeMainAgentDeliveryText(text, fallbackText, max);
}

function firstDeliverySectionItem(report: any, sectionId: string) {
  const section = Array.isArray(report?.sections)
    ? report.sections.find((item: any) => item?.id === sectionId || item?.title === sectionId)
    : null;
  return Array.isArray(section?.items) ? section.items.find(Boolean) : "";
}

function buildGroupCompletionSummary(task: any, summary: any, latestCard: any = null) {
  const report = summary?.delivery_report || summary?.deliveryReport || null;
  const rawStatus = report?.status || summary?.status || task?.status;
  const statusMeta = groupTaskStatusMeta(groupTaskDisplayStatus(task, summary, latestCard, rawStatus));
  if (!task && !report) return null;
  if (!statusMeta.terminal && !report) return null;
  if (!statusMeta.terminal) return null;
  const status = statusMeta.deliveryStatus;
  const fallbackHeadline = status === "done"
    ? "任务已经完成，我已整理交付结果。"
    : status === "failed"
      ? "任务还没有完成，我已整理原因和下一步。"
      : status === "cancelled"
        ? "任务已取消，当前状态已整理。"
        : "我已整理阶段性处理结果。";
  const headline = friendlyGroupCompletionText(
    report?.headline || summary?.headline || summary?.summary || task?.status_detail || firstDeliverySectionItem(report, "完成内容"),
    fallbackHeadline,
    260,
  );
  const fileCount = countGroupStatusItems(
    summary?.actual_file_change_count,
    summary?.file_change_count,
    summary?.file_changes?.count,
    summary?.actual_file_changes,
    report?.files,
  );
  const verificationCount = countGroupStatusItems(
    summary?.external_runner_verification_count,
    summary?.verification_count,
    summary?.verification_executed,
    summary?.verification,
    report?.verification,
  );
  const riskCount = countGroupStatusItems(
    summary?.blockers,
    summary?.needs,
    summary?.failed_gates,
    summary?.acceptance_gate?.failed_checks,
    report?.risks,
  );
  const nextAction = friendlyGroupCompletionText(
    Array.isArray(report?.next_action) ? report.next_action[0] : report?.next_action || firstDeliverySectionItem(report, "下一步"),
    status === "done" ? "可以查看改动详情，或继续补充新的要求。" : "请先处理上面的风险或补充信息。",
    220,
  );
  return {
    schema: "ccm-group-main-agent-completion-summary-v1",
    title: friendlyGroupCompletionText(report?.title || task?.title || "任务交付", "任务交付", 120),
    status,
    status_label: report?.status_label || groupDeliveryStatusLabel(status),
    headline,
    file_change_count: fileCount,
    verification_count: verificationCount,
    risk_count: riskCount,
    next_action: nextAction,
    display_policy: { user_visible: true, technical_details_default_collapsed: true },
  };
}

function buildGroupPickupSummary(task: any, summary: any, completionSummary: any, latestCard: any = null) {
  const report = summary?.delivery_report || summary?.deliveryReport || null;
  const existing = summary?.pickup_summary
    || summary?.pickupSummary
    || report?.pickup_summary
    || report?.pickupSummary
    || null;
  const rawStatus = existing?.status || report?.status || summary?.status || task?.status;
  const statusMeta = groupTaskStatusMeta(groupTaskDisplayStatus(task, summary, latestCard, rawStatus));
  if (!task && !existing && !report) return null;
  if (!existing && !report && !statusMeta.terminal) return null;
  if (!statusMeta.terminal && (String(rawStatus || "").toLowerCase() === "done" || String(report?.status || "").toLowerCase() === "done")) return null;
  const status = existing?.status || report?.status || completionSummary?.status || statusMeta.deliveryStatus;
  const headline = friendlyGroupCompletionText(
    existing?.headline || report?.headline || completionSummary?.headline || task?.status_detail || "",
    statusMeta.terminal ? "我已整理本轮任务结果。" : "我已整理当前任务状态。",
    260,
  );
  const currentState = friendlyGroupCompletionText(
    existing?.current_state || existing?.currentState || headline,
    headline,
    260,
  );
  const reviewItems = Array.isArray(existing?.review_items || existing?.reviewItems)
    ? (existing.review_items || existing.reviewItems)
      .map((item: any) => friendlyGroupCompletionText(item, "", 180))
      .filter(Boolean)
      .slice(0, 5)
    : [];
  const resumeAction = friendlyGroupCompletionText(
    existing?.resume_action
      || existing?.resumeAction
      || completionSummary?.next_action
      || (Array.isArray(report?.next_action) ? report.next_action[0] : report?.next_action)
      || "",
    statusMeta.terminal ? "可以查看交付总结，或继续补充新的要求。" : "我会继续推进当前任务，并在完成后汇总给你。",
    220,
  );
  return {
    schema: "ccm-group-main-agent-pickup-summary-v1",
    source_schema: existing?.schema || "",
    title: friendlyGroupCompletionText(existing?.title || "回来继续看这里", "回来继续看这里", 80),
    status,
    status_label: existing?.status_label || existing?.statusLabel || report?.status_label || completionSummary?.status_label || groupDeliveryStatusLabel(statusMeta.deliveryStatus),
    headline,
    current_state: currentState,
    review_items: reviewItems,
    resume_action: resumeAction,
    technical_hint: friendlyGroupCompletionText(
      existing?.technical_hint || existing?.technicalHint || "底层执行记录和排障信息默认收在技术详情里。",
      "底层执行记录和排障信息默认收在技术详情里。",
      180,
    ),
    display_policy: {
      user_visible: true,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function liveTodoStatusLabel(status: any) {
  const value = String(status || "").toLowerCase();
  if (["completed", "done", "success", "succeeded"].includes(value)) return "已完成";
  if (["in_progress", "active", "running"].includes(value)) return "进行中";
  if (["reviewing"].includes(value)) return "验收中";
  if (["reworking"].includes(value)) return "返工中";
  if (["needs_confirmation", "needs_user", "blocked"].includes(value)) return "待确认";
  if (["failed", "error"].includes(value)) return "失败";
  if (["cancelled", "canceled", "stopped"].includes(value)) return "已停止";
  return "等待";
}

function groupTodoTextNeedsUserAction(value: any, phase: any = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const phaseText = String(phase || "").toLowerCase();
  const userActionPattern = /(?:需要你|等你|等待你|请你|请确认|确认(?:是否|计划|范围|授权|影响|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|选择|授权|回复|上传|输入|填写|处理\s*\d+\s*个待确认问答|人工确认|待确认问答|是否允许|是否继续|允许继续|确认并继续)/i;
  if (userActionPattern.test(text)) return true;
  if (["needs_user", "waiting_user", "needs_confirmation"].includes(phaseText) && /确认(?:计划|范围|授权|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|回复|授权|选择|上传|输入|填写|处理\s*\d+\s*个待确认问答/.test(text)) return true;
  return false;
}

function groupStatusPhaseNeedsUserAction(status: any) {
  if (String(status?.phase || "").toLowerCase() !== "needs_user") return false;
  return [
    status?.label,
    status?.status_label,
    status?.statusLabel,
    status?.latest_progress_checkpoint?.label,
    status?.latestProgressCheckpoint?.label,
    status?.latest_progress_checkpoint?.detail,
    status?.latestProgressCheckpoint?.detail,
    status?.current_todo_summary?.needs_action,
    status?.currentTodoSummary?.needsAction,
  ].some((item: any) => groupTodoTextNeedsUserAction(item, "needs_user"));
}

function buildGroupCurrentTodoSummary(latestCard: any, latestTask: any, latestStatusMeta: any) {
  if (!latestCard || latestStatusMeta?.terminal) return null;
  const todo = latestCard.live_todo_plan || latestCard.liveTodoPlan || latestCard.mainAgentDecision?.todo_plan || latestCard.main_agent_decision?.todo_plan || null;
  const steps = Array.isArray(todo?.steps) ? todo.steps.filter((item: any) => item?.content || item?.label || item?.activeForm || item?.active_form) : [];
  if (!steps.length) return null;
  const policy = { ...(todo?.display || {}), ...(todo?.display_policy || todo?.displayPolicy || {}) };
  const allDone = steps.every((item: any) => ["completed", "done", "success", "succeeded"].includes(String(item?.status || "").toLowerCase()));
  const archiveCompleted = policy.archive_completed_todo === true
    || policy.archiveCompletedTodo === true
    || policy.archived_when_complete === true
    || policy.archivedWhenComplete === true
    || policy.visible_when_completed === false
    || policy.visibleWhenCompleted === false;
  const hasVerificationReminder = todo?.verification_reminder || todo?.verificationReminder || todo?.verification_nudge === true || todo?.verificationNudge === true;
  if (allDone && archiveCompleted && !hasVerificationReminder) return null;
  const activeStatuses = new Set(["in_progress", "active", "running", "reviewing", "reworking", "needs_confirmation", "needs_user", "failed"]);
  const activeStep = steps.find((item: any) => activeStatuses.has(String(item?.status || "").toLowerCase()))
    || steps.find((item: any) => !["completed", "done", "cancelled", "canceled"].includes(String(item?.status || "").toLowerCase()))
    || steps[steps.length - 1];
  if (!activeStep) return null;
  const completedCount = steps.filter((item: any) => ["completed", "done", "success", "succeeded"].includes(String(item?.status || "").toLowerCase())).length;
  const status = String(activeStep.status || "pending").toLowerCase();
  const label = friendlyGroupCompletionText(activeStep.content || activeStep.label || "我正在处理当前任务", "我正在处理当前任务", 160);
  const activeForm = friendlyGroupCompletionText(activeStep.activeForm || activeStep.active_form || label, label, 160);
  const todoNextAction = todo?.next_action || todo?.nextAction || todo?.next_step || todo?.nextStep || "";
  const detail = friendlyGroupCompletionText(activeStep.detail || todoNextAction || latestCard.next_action || latestTask?.status_detail || "", "", 220);
  const recentStep = [...steps]
    .reverse()
    .find((item: any) => ["completed", "done", "success", "succeeded"].includes(String(item?.status || "").toLowerCase()) && item !== activeStep);
  const recentAction = friendlyGroupCompletionText(
    recentStep?.activeForm || recentStep?.active_form || recentStep?.content || recentStep?.label || latestCard.latest_progress_checkpoint?.label || "",
    "",
    180,
  );
  const needsAction = friendlyGroupCompletionText(
    groupTodoTextNeedsUserAction(activeStep.needs_action || activeStep.needsAction || todo?.needs_action || todo?.needsAction || "", latestStatusMeta?.phase || status)
      ? activeStep.needs_action || activeStep.needsAction || todo?.needs_action || todo?.needsAction || ""
      : "",
    "",
    220,
  );
  const nextAction = friendlyGroupCompletionText(todoNextAction || latestCard.next_action || latestTask?.status_detail || detail, "", 220);
  return {
    schema: "ccm-group-main-agent-current-todo-v1",
    title: todo?.title || "当前 Todo",
    task_id: latestTask?.id || latestCard.task_id || latestCard.taskId || "",
    task_title: latestTask?.title || latestCard.title || "",
    step_id: activeStep.id || "",
    label,
    active_form: activeForm,
    detail,
    recent_action: recentAction,
    recentAction,
    needs_action: needsAction,
    needsAction,
    status,
    status_label: liveTodoStatusLabel(status),
    progress_label: `${completedCount}/${steps.length}`,
    completed_count: completedCount,
    total_count: steps.length,
    next_action: nextAction,
    display_policy: {
      user_visible: true,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
      archive_completed_todo: archiveCompleted,
      visible_when_completed: !archiveCompleted,
    },
  };
}

function normalizeGroupProgressWorkItem(row: any, fallbackTask: any, index: number) {
  if (!row || typeof row !== "object") return null;
  const target = friendlyGroupCompletionText(
    row.target || row.owner || row.agent || row.project || row.name || fallbackTask?.target_project || "",
    "",
    80,
  );
  const subject = friendlyGroupCompletionText(
    row.subject || row.title || row.task || row.message || row.description || fallbackTask?.title || "执行成员工作项",
    "执行成员工作项",
    140,
  );
  if (!target && !subject) return null;
  return {
    id: String(row.id || row.work_item_id || row.workItemId || `group-progress-work-item-${index}`),
    target,
    subject,
    status: String(row.status || row.state || "pending").toLowerCase(),
    updated_at: row.updatedAt || row.updated_at || row.startedAt || row.started_at || row.createdAt || row.created_at || "",
    requeue_reason: friendlyGroupCompletionText(row.requeueReason || row.requeue_reason || row.reason || "", "", 140),
  };
}

function groupProgressWorkItems(latestCard: any, latestTask: any) {
  const sources: any[] = [];
  const explicit = latestCard?.work_items || latestCard?.workItems || latestTask?.work_items || latestTask?.workItems || [];
  if (Array.isArray(explicit)) sources.push(...explicit);
  const summary = latestCard?.work_item_summary || latestCard?.workItemSummary || latestTask?.work_item_summary || latestTask?.workItemSummary || {};
  if (Array.isArray(summary.next_claimable || summary.nextClaimable)) {
    sources.push(...(summary.next_claimable || summary.nextClaimable).map((item: any) => ({ ...item, status: item.status || "pending" })));
  }
  if (Array.isArray(summary.blocked)) {
    sources.push(...summary.blocked.map((item: any) => ({ ...item, status: item.status || "blocked" })));
  }
  const result = sources
    .map((item, index) => normalizeGroupProgressWorkItem(item, latestTask, index))
    .filter(Boolean);
  const seen = new Set<string>();
  return result.filter((item: any) => {
    const key = `${item.id}:${item.target}:${item.subject}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getGroupWorkItemRequeueMarker(latestCard: any, latestTask: any) {
  return latestCard?.work_item_state?.last_requeue
    || latestCard?.workItemState?.lastRequeue
    || latestTask?.work_item_state?.last_requeue
    || latestTask?.workItemState?.lastRequeue
    || latestTask?.delivery_summary?.work_item_state?.last_requeue
    || latestTask?.deliverySummary?.workItemState?.lastRequeue
    || null;
}

function buildGroupProgressRefreshSummary(
  latestTask: any,
  latestCard: any,
  latestStatusMeta: any,
  childAgentStatusSummary: any,
  latestCheckpoint: any,
  nowMs = Date.now(),
) {
  if (!latestTask || latestStatusMeta?.terminal) return null;
  const staleMs = Math.max(60_000, Number(latestTask?.progress_refresh_stale_ms || latestTask?.progressRefreshStaleMs || GROUP_MAIN_AGENT_PROGRESS_REFRESH_STALE_MS));
  const lastProgressMs = groupProgressTimeMs(
    latestCheckpoint?.at,
    latestCard?.updated_at,
    latestCard?.updatedAt,
    latestTask?.updated_at,
    latestTask?.updatedAt,
    latestTask?.started_at,
    latestTask?.startedAt,
    latestTask?.created_at,
  );
  const ageMs = lastProgressMs ? Math.max(0, nowMs - lastProgressMs) : 0;
  const items = groupProgressWorkItems(latestCard, latestTask);
  const stalledItems = items.filter((item: any) => {
    if (!["in_progress", "running", "active", "reviewing"].includes(item.status)) return false;
    const itemMs = groupProgressTimeMs(item.updated_at, latestTask?.updated_at);
    return itemMs > 0 && nowMs - itemMs >= staleMs;
  });
  const nextClaimable = items.filter((item: any) => ["pending", "queued", "waiting"].includes(item.status)).slice(0, 3);
  const requeueMarker = getGroupWorkItemRequeueMarker(latestCard, latestTask);
  const longWithoutVisibleProgress = lastProgressMs > 0 && ageMs >= staleMs;
  const pendingTooLong = ["pending", "queued"].includes(String(latestTask.status || "").toLowerCase()) && longWithoutVisibleProgress;
  if (!stalledItems.length && !requeueMarker && !longWithoutVisibleProgress && !pendingTooLong) return null;

  const ageLabel = groupProgressAgeLabel(ageMs);
  const firstStalled = stalledItems[0] || null;
  const firstNext = nextClaimable[0] || null;
  const headline = requeueMarker
    ? "我已检测到卡住的执行成员工作项，并把它们放回可继续派发状态。"
    : stalledItems.length
      ? `${stalledItems.length} 个执行成员工作项长时间没有新进展，我会先刷新状态，再决定继续等待、重派或定向补充。`
      : pendingTooLong
        ? `这项任务已排队 ${ageLabel || "一段时间"}，我会检查执行通道并接上下一步。`
        : `这项任务已经 ${ageLabel || "一段时间"} 没有新的可展示进展，我会主动刷新状态。`;
  const reviewItems = [
    latestCheckpoint?.label ? `最后进展：${latestCheckpoint.label}` : "",
    firstStalled ? `待确认：${firstStalled.target || "执行成员"} 是否仍在处理「${firstStalled.subject}」` : "",
    firstNext ? `可接续：${firstNext.target || "执行成员"}「${firstNext.subject}」` : "",
    childAgentStatusSummary?.summary_text ? `执行成员状态：${childAgentStatusSummary.summary_text}` : "",
    requeueMarker?.reason ? `恢复原因：${requeueMarker.reason}` : "",
  ].map(item => friendlyGroupCompletionText(item, "", 160)).filter(Boolean).slice(0, 5);
  const nextAction = friendlyGroupCompletionText(
    firstNext
      ? `优先接上 ${firstNext.target || "执行成员"} 的「${firstNext.subject}」，完成后继续验收和总结。`
      : stalledItems.length
        ? "先确认执行成员是否还在执行；没有新结果就重新派发或定向补充。"
        : pendingTooLong
        ? "检查执行通道和队列状态，能恢复就继续推进；不能恢复会提示你处理。"
        : "刷新任务卡状态；如果没有新结果，会继续等待或补派。",
    "我会刷新任务状态并接上下一步。",
    220,
  );
  return {
    schema: "ccm-group-main-agent-progress-refresh-v1",
    title: "进度刷新提醒",
    status: requeueMarker ? "requeued" : stalledItems.length || pendingTooLong ? "needs_refresh" : "watching",
    status_label: requeueMarker ? "已接续" : stalledItems.length || pendingTooLong ? "需要接续" : "刷新中",
    headline: friendlyGroupCompletionText(headline, "我已整理当前进度刷新状态。", 240),
    current_state: friendlyGroupCompletionText(headline, "我已整理当前进度刷新状态。", 240),
    review_items: reviewItems,
    next_action: nextAction,
    last_progress_age_label: ageLabel,
    stalled_work_item_count: stalledItems.length,
    display_policy: {
      user_visible: true,
      show_for_ordinary_conversation: false,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

function firstGroupStatusObject(...values: any[]) {
  return values.find(value => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function groupStatusSafeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function scrubGroupTestAgentEvidencePathText(value: any) {
  return String(value || "")
    .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
    .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
    .replace(/\bccm-test-agent-[\w-]+\b/gi, "TestAgent 结构化记录")
    .replace(/\b(?:browser_har|artifactDir|artifact_manifest|report_json|report\.json|report\.md|verdict\.json|artifact-manifest\.json)\b/gi, "证据文件");
}

function groupTestAgentFailureTypeLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    issue: "工作单问题",
    server: "服务启动",
    command: "命令验证",
    http: "接口检查",
    browser: "浏览器检查",
    required_check: "必检项",
    acceptance: "验收条件",
  };
  return labels[value] || "复核问题";
}

function collectGroupStatusTestAgentFailureItems(source: any, depth = 0, seenObjects = new Set<any>()): any[] {
  if (!source || typeof source !== "object" || depth > 5) return [];
  if (seenObjects.has(source)) return [];
  seenObjects.add(source);
  if (Array.isArray(source)) {
    return source.flatMap(item => collectGroupStatusTestAgentFailureItems(item, depth + 1, seenObjects));
  }
  const rows = [
    ...groupStatusSafeArray(source.failureSummary),
    ...groupStatusSafeArray(source.failure_summary),
  ].filter((item: any) => item && typeof item === "object" && (item.type || item.title || item.reason || item.nextAction || item.diagnostics));
  const nestedKeys = [
    "test_agent_report",
    "testAgentReport",
    "test_agent_verdict",
    "testAgentVerdict",
    "verdict",
    "technical",
    "delivery_report",
    "deliveryReport",
    "final_report",
    "finalReport",
    "receipt",
  ];
  for (const key of nestedKeys) {
    if (source[key]) rows.push(...collectGroupStatusTestAgentFailureItems(source[key], depth + 1, seenObjects));
  }
  return rows;
}

function summarizeGroupTestAgentFailureItem(item: any) {
  const type = groupTestAgentFailureTypeLabel(item?.type);
  const project = cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(item?.project || ""), "", 70);
  const title = cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(item?.title || item?.reason || ""), "复核发现问题", 100);
  const reason = cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(item?.reason || item?.status || ""), "需要补齐或修复后再验收。", 160);
  const prefix = project ? `${project}：${type}` : type;
  return `${prefix}「${title}」未通过：${reason}`;
}

function summarizeGroupTestAgentDiagnosticItem(item: any) {
  const diagnostics = groupStatusSafeArray(item?.diagnostics);
  const nextActions = item?.nextAction ? [item.nextAction] : [];
  const first = [...diagnostics, ...nextActions]
    .map(value => cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(value), "", 180))
    .find(Boolean);
  if (!first) return "";
  const title = cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(item?.title || item?.type), "该问题", 70);
  return `${title}：${first}`;
}

function buildGroupStatusIndependentReviewSummaryFromTestAgentFailure(...sources: any[]) {
  const seen = new Set<string>();
  const items: any[] = [];
  for (const source of sources) {
    for (const item of collectGroupStatusTestAgentFailureItems(source)) {
      const key = [item?.type || "", item?.project || "", item?.title || "", item?.reason || "", item?.nextAction || ""].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  if (!items.length) return null;
  const stateText = items.map(item => [item?.status, item?.result, item?.recommendation, item?.reason].filter(Boolean).join(" ")).join(" ");
  const needsUser = /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(stateText);
  const needsRework = !needsUser || /failed|fail|not_verified|rework|未通过|失败|返工/i.test(stateText);
  const status = needsRework ? "needs_rework" : "needs_user";
  const failureLines = [...new Set(items.map(summarizeGroupTestAgentFailureItem).filter(Boolean))].slice(0, 3);
  const diagnosticLines = [...new Set(items.map(summarizeGroupTestAgentDiagnosticItem).filter(Boolean))].slice(0, 2);
  const rows = [
    status === "needs_rework" ? "TestAgent：需返工" : "TestAgent：等你确认",
    ...failureLines.map(item => `返工重点：${item}`),
    ...diagnosticLines.map(item => `排查建议：${item}`),
  ].map(item => cleanGroupStatusFollowupText(item, "", 180)).filter(Boolean);
  return {
    schema: "ccm-main-agent-independent-review-summary-v1",
    title: "独立复核",
    status,
    status_label: status === "needs_rework" ? "需返工" : "等你确认",
    headline: status === "needs_rework"
      ? "TestAgent 复核未通过，我会先安排返工，再重新验收。"
      : "TestAgent 复核需要你确认，我会先暂停最终验收。",
    rows,
    next_action: status === "needs_rework"
      ? "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。"
      : "等待你确认复核标记的问题，确认后我再继续。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function getGroupStatusIndependentReviewSummary(source: any = {}) {
  const card = source?.latest_card || source?.latestCard || source?.task_card || source?.taskCard || {};
  const delivery = source?.latest_delivery_summary
    || source?.latestDeliverySummary
    || source?.delivery_summary
    || source?.deliverySummary
    || card?.delivery
    || {};
  const report = source?.final_report
    || source?.finalReport
    || source?.delivery_report
    || source?.deliveryReport
    || delivery?.delivery_report
    || delivery?.deliveryReport
    || card?.final_report
    || card?.finalReport
    || card?.delivery_report
    || card?.deliveryReport
    || {};
  const technical = card?.technical || delivery?.technical || report?.technical || {};
  const explicitSummary = firstGroupStatusObject(
    source?.independent_review_summary,
    source?.independentReviewSummary,
    source?.test_agent_review_summary,
    source?.testAgentReviewSummary,
    delivery?.independent_review_summary,
    delivery?.independentReviewSummary,
    delivery?.test_agent_review_summary,
    delivery?.testAgentReviewSummary,
    report?.independent_review_summary,
    report?.independentReviewSummary,
    report?.test_agent_review_summary,
    report?.testAgentReviewSummary,
    card?.independent_review_summary,
    card?.independentReviewSummary,
    card?.test_agent_review_summary,
    card?.testAgentReviewSummary,
    technical?.independent_review_summary,
    technical?.independentReviewSummary,
    technical?.test_agent_review_summary,
    technical?.testAgentReviewSummary,
  );
  if (explicitSummary) return explicitSummary;
  return buildGroupStatusIndependentReviewSummaryFromTestAgentFailure(source, delivery, report, card, technical);
}

function groupReviewRowText(item: any) {
  if (!item || typeof item !== "object") return item;
  return [item.summary, item.detail, item.reason, item.message, item.label, item.title, item.verdict, item.status].filter(Boolean).join(" ");
}

function groupIndependentReviewStatusKind(summary: any = {}) {
  const text = [
    summary.status,
    summary.verdict,
    summary.recommendation,
    summary.status_label,
    summary.statusLabel,
    summary.headline,
    ...(Array.isArray(summary.rows) ? summary.rows.map(groupReviewRowText) : []),
  ].filter(Boolean).join(" ");
  if (/needs[_-]?rework|rework|changes_requested|failed|fail|reject|not_verified|需返工|返工|未通过|缺口|未覆盖/i.test(text)) return "needs_rework";
  if (/needs[_-]?user|waiting[_-]?user|unknown|manual|人工确认|等你确认|待确认|需要你确认|需要用户/i.test(text)) return "needs_user";
  if (/passed|pass|accept|approved|已通过|通过|可以继续/i.test(text)) return "passed";
  return "recorded";
}

function summarizeGroupStatusIndependentReview(source: any = {}) {
  const summary = getGroupStatusIndependentReviewSummary(source);
  if (!summary) return null;
  const status = groupIndependentReviewStatusKind(summary);
  const fallbackLabel = status === "needs_rework" ? "需返工" : status === "needs_user" ? "等你确认" : status === "passed" ? "已通过" : "已记录";
  const statusLabel = cleanGroupStatusFollowupText(summary.status_label || summary.statusLabel || fallbackLabel, fallbackLabel, 60);
  const rows = (Array.isArray(summary.rows) ? summary.rows : Array.isArray(summary.items) ? summary.items : [])
    .map((item: any) => cleanGroupStatusFollowupText(groupReviewRowText(item), "", 140))
    .filter(Boolean)
    .slice(0, 3);
  const headline = cleanGroupStatusFollowupText(
    summary.headline || summary.summary || rows[0] || "",
    status === "needs_rework"
      ? "独立复核发现待处理缺口。"
      : status === "needs_user"
        ? "独立复核需要你确认。"
        : status === "passed"
          ? "独立复核已通过。"
          : "独立复核结论已记录。",
    200,
  );
  const nextAction = cleanGroupStatusFollowupText(
    summary.next_action || summary.nextAction || "",
    status === "needs_rework"
      ? "先按复核缺口返工，修复后重新运行 TestAgent/独立复核，再给最终总结。"
      : status === "needs_user"
        ? "等待你确认复核标记的问题，确认后我再继续。"
        : status === "passed"
          ? "继续核对交付总结、改动和验证结果。"
          : "继续等待完整复核证据或最终总结。",
    220,
  );
  return {
    status,
    statusLabel,
    blocking: status === "needs_rework" || status === "needs_user",
    headline,
    rows,
    nextAction,
  };
}

function groupStatusTestAgentPlanRowText(item: any) {
  if (!item || typeof item !== "object") return item;
  return [item.summary, item.detail, item.message, item.label, item.title, item.status].filter(Boolean).join(" ");
}

function groupStatusTestAgentPlanStatusKind(summary: any = {}, plan: any = null) {
  const text = [
    summary.status,
    summary.verdict,
    summary.status_label,
    summary.statusLabel,
    summary.headline,
    ...(Array.isArray(summary.rows) ? summary.rows.map(groupStatusTestAgentPlanRowText) : []),
    ...(Array.isArray(summary.issues) ? summary.issues.map(groupStatusTestAgentPlanRowText) : []),
  ].filter(Boolean).join(" ");
  if (plan?.valid === false || /blocked|invalid|error|failed|fail|需修复|预检未通过|缺少|阻塞/i.test(text)) return "blocked";
  if (plan?.valid === true || /ready|valid|可执行|已生成|启动|真实复核/i.test(text)) return "ready";
  return "recorded";
}

function getGroupStatusTestAgentExecutionPlanSummary(source: any = {}) {
  const card = source?.latest_card || source?.latestCard || source?.task_card || source?.taskCard || {};
  const delivery = source?.latest_delivery_summary
    || source?.latestDeliverySummary
    || source?.delivery_summary
    || source?.deliverySummary
    || card?.delivery
    || {};
  const report = source?.final_report
    || source?.finalReport
    || source?.delivery_report
    || source?.deliveryReport
    || delivery?.delivery_report
    || delivery?.deliveryReport
    || card?.final_report
    || card?.finalReport
    || card?.delivery_report
    || card?.deliveryReport
    || {};
  const technical = card?.technical || delivery?.technical || report?.technical || {};
  const explicitSummary = firstGroupStatusObject(
    source?.test_agent_execution_plan_summary,
    source?.testAgentExecutionPlanSummary,
    delivery?.test_agent_execution_plan_summary,
    delivery?.testAgentExecutionPlanSummary,
    report?.test_agent_execution_plan_summary,
    report?.testAgentExecutionPlanSummary,
    card?.test_agent_execution_plan_summary,
    card?.testAgentExecutionPlanSummary,
    technical?.test_agent_execution_plan_summary,
    technical?.testAgentExecutionPlanSummary,
  );
  const plan = firstGroupStatusObject(
    source?.test_agent_execution_plan,
    source?.testAgentExecutionPlan,
    delivery?.test_agent_execution_plan,
    delivery?.testAgentExecutionPlan,
    report?.test_agent_execution_plan,
    report?.testAgentExecutionPlan,
    card?.test_agent_execution_plan,
    card?.testAgentExecutionPlan,
    technical?.test_agent_execution_plan,
    technical?.testAgentExecutionPlan,
  );
  if (explicitSummary) return { summary: explicitSummary, plan };
  const detail = source?.test_agent_execution_plan_detail
    || source?.testAgentExecutionPlanDetail
    || delivery?.test_agent_execution_plan_detail
    || delivery?.testAgentExecutionPlanDetail
    || report?.test_agent_execution_plan_detail
    || report?.testAgentExecutionPlanDetail
    || card?.test_agent_execution_plan_detail
    || card?.testAgentExecutionPlanDetail
    || source?.detail
    || source?.message
    || "";
  const rawTextSummary = source?.test_agent_execution_plan_summary
    || source?.testAgentExecutionPlanSummary
    || delivery?.test_agent_execution_plan_summary
    || delivery?.testAgentExecutionPlanSummary
    || report?.test_agent_execution_plan_summary
    || report?.testAgentExecutionPlanSummary
    || card?.test_agent_execution_plan_summary
    || card?.testAgentExecutionPlanSummary
    || "";
  if (!plan && !detail && !rawTextSummary) return null;
  const planSummary = plan?.summary || {};
  const issues = groupStatusSafeArray(plan?.issues)
    .map((item: any) => cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(groupStatusTestAgentPlanRowText(item)), "", 160))
    .filter(Boolean)
    .slice(0, 5);
  const commandCount = Number(planSummary.commands || groupStatusSafeArray(plan?.commands).length || 0);
  const httpCount = Number(planSummary.httpChecks || 0) + Number(planSummary.adversarialHttpChecks || 0);
  const browserCount = Number(planSummary.browserChecks || 0);
  const projectCount = Number(planSummary.projects || groupStatusSafeArray(plan?.projects).length || 0);
  const rows = [
    projectCount ? `复核范围：${projectCount} 个项目` : "",
    commandCount ? `命令检查：${commandCount} 项` : "",
    httpCount ? `HTTP 检查：${httpCount} 项` : "",
    browserCount ? `浏览器检查：${browserCount} 项` : "",
  ].filter(Boolean);
  const status = groupStatusTestAgentPlanStatusKind({}, plan);
  const fallbackHeadline = cleanGroupStatusFollowupText(
    rawTextSummary || detail,
    "TestAgent 复核计划已生成，我会先确认计划可执行，再启动真实复核。",
    260,
  );
  return {
    summary: {
      schema: "ccm-test-agent-execution-plan-summary-v1",
      title: "TestAgent 复核计划",
      status,
      status_label: status === "ready" ? "可执行" : status === "blocked" ? "需修复" : "已生成",
      headline: status === "ready"
        ? "TestAgent 已生成复核计划，我会按这份计划启动真实验证。"
        : status === "blocked"
          ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
          : fallbackHeadline,
      rows: rows.length ? rows : [fallbackHeadline],
      issues,
      next_action: status === "ready"
        ? "启动 TestAgent 真实复核，并把结论纳入最终验收。"
        : status === "blocked"
          ? "修复 TestAgent 工作单或项目路径后重新生成复核计划。"
          : "等待 TestAgent 复核计划补齐更多结构化信息。",
    },
    plan,
  };
}

function summarizeGroupStatusTestAgentExecutionPlan(source: any = {}) {
  const payload = getGroupStatusTestAgentExecutionPlanSummary(source);
  if (!payload?.summary) return null;
  const summary = payload.summary;
  const status = groupStatusTestAgentPlanStatusKind(summary, payload.plan);
  const fallbackLabel = status === "ready" ? "可执行" : status === "blocked" ? "需修复" : "已生成";
  const statusLabel = cleanGroupStatusFollowupText(summary.status_label || summary.statusLabel || fallbackLabel, fallbackLabel, 60);
  const seen = new Set<string>();
  const rows = [
    ...groupStatusSafeArray(summary.rows).map((item: any) => cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(groupStatusTestAgentPlanRowText(item)), "", 140)),
    ...groupStatusSafeArray(summary.issues).map((item: any) => `预检问题：${cleanGroupStatusFollowupText(scrubGroupTestAgentEvidencePathText(groupStatusTestAgentPlanRowText(item)), "", 120)}`),
  ].filter((item: string) => {
    const text = String(item || "").trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  }).slice(0, 4);
  const headline = cleanGroupStatusFollowupText(
    scrubGroupTestAgentEvidencePathText(summary.headline || summary.summary || rows[0] || ""),
    status === "ready"
      ? "TestAgent 复核计划已生成，我会按计划启动真实验证。"
      : status === "blocked"
        ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
        : "TestAgent 复核计划已记录，正在等待下一步复核。",
    220,
  );
  const nextAction = cleanGroupStatusFollowupText(
    scrubGroupTestAgentEvidencePathText(summary.next_action || summary.nextAction || ""),
    status === "ready"
      ? "启动 TestAgent 真实复核，并把结论纳入最终验收。"
      : status === "blocked"
        ? "修复 TestAgent 工作单或项目路径后重新生成复核计划。"
        : "等待 TestAgent 复核计划补齐更多结构化信息。",
    220,
  );
  return {
    status,
    statusLabel,
    headline,
    rows,
    nextAction,
  };
}

export function buildGroupMainAgentStatus(input: {
  groupId: string;
  tasks: any[];
  agentQa: any[];
  getRuntime: (task: any) => any;
}) {
  const activeStatusValues = new Set(["pending", "queued", "in_progress", "running", "reviewing", "reworking", "needs_rework", "blocked", "needs_user", "waiting_user", "needs_confirmation"]);
  const groupTasks = (input.tasks || [])
    .filter((task: any) => String(task?.group_id || task?.groupId || "") === input.groupId)
    .filter((task: any) => !task?.archived && !task?.deleted_at)
    .sort((a: any, b: any) => taskUpdatedMs(b) - taskUpdatedMs(a));
  const activeTasks = groupTasks.filter((task: any) => activeStatusValues.has(String(task?.status || "").toLowerCase()));
  const latestTask = activeTasks[0] || groupTasks[0] || null;
  const latestRuntime = latestTask ? input.getRuntime(latestTask) : null;
  const latestCard = latestRuntime?.taskCard || latestRuntime?.task_card || null;
  const latestSummary = latestTask?.delivery_summary || {};
  const latestDisplayStatus = groupTaskDisplayStatus(latestTask, latestSummary, latestCard, latestTask?.status || latestCard?.phase);
  const latestStatusMeta = groupTaskStatusMeta(latestDisplayStatus);
  const completionSummary = buildGroupCompletionSummary(latestTask, latestSummary, latestCard);
  const pickupSummary = buildGroupPickupSummary(latestTask, latestSummary, completionSummary, latestCard);
  const checkpointSource = latestCard?.progress_checkpoints || latestCard?.progressCheckpoints || latestCard?.display_stream?.progress_checkpoints || latestCard?.displayStream?.progressCheckpoints || null;
  const currentTodoSummary = buildGroupCurrentTodoSummary(latestCard, latestTask, latestStatusMeta);
  const checkpointItems = Array.isArray(checkpointSource?.items)
    ? checkpointSource.items
    : Array.isArray(checkpointSource)
      ? checkpointSource
      : [];
  const baseMeaningfulCheckpoints = checkpointItems
    .map((item: any) => ({
      id: item?.id || "",
      label: compactGroupStatusText(item?.label || item?.title, 120),
      detail: compactGroupStatusText(item?.detail || "", 180),
      status: checkpointStatus(item?.status),
      phase: item?.phase || latestCard?.phase || "",
      at: item?.at || "",
      task_id: latestTask?.id || "",
    }))
    .filter((item: any) => item.label && item.status !== "pending");
  const completionCheckpoint = completionSummary && latestStatusMeta.terminal ? {
    id: `completion-${latestTask?.id || "latest"}`,
    label: groupDeliveryCheckpointLabel(completionSummary.status),
    detail: completionSummary.headline,
    status: completionSummary.status === "failed" ? "failed" : completionSummary.status === "done" ? "done" : "warning",
    phase: latestStatusMeta.phase,
    at: latestTask?.completed_at || latestTask?.updated_at || "",
    task_id: latestTask?.id || "",
  } : null;
  const meaningfulCheckpoints = completionCheckpoint
    ? [...baseMeaningfulCheckpoints.filter((item: any) => item.id !== completionCheckpoint.id), completionCheckpoint]
    : baseMeaningfulCheckpoints;
  const latestCheckpoint = meaningfulCheckpoints[meaningfulCheckpoints.length - 1] || null;
  const runningAgents = latestStatusMeta.terminal
    ? []
    : latestCard?.active_agents?.length
      ? latestCard.active_agents
      : (latestRuntime?.agents || [])
        .filter((agent: any) => ["spawning", "ready", "prompt_accepted", "running", "reviewing"].includes(String(agent?.state || "")))
        .map((agent: any) => agent.project)
        .filter(Boolean);
  const childAgentStatusSummary = buildGroupChildAgentStatusSummary(latestCard, latestSummary, latestStatusMeta);
  const progressRefreshSummary = buildGroupProgressRefreshSummary(latestTask, latestCard, latestStatusMeta, childAgentStatusSummary, latestCheckpoint);
  const independentReviewSummary = getGroupStatusIndependentReviewSummary({
    latest_delivery_summary: latestSummary,
    latestDeliverySummary: latestSummary,
    latest_card: latestCard,
    latestCard,
    task_card: latestCard,
    taskCard: latestCard,
    completion_summary: completionSummary,
    completionSummary,
  });
  const independentReviewStatus = summarizeGroupStatusIndependentReview({ independent_review_summary: independentReviewSummary });
  const testAgentExecutionPlanSummary = independentReviewSummary ? null : getGroupStatusTestAgentExecutionPlanSummary({
    latest_delivery_summary: latestSummary,
    latestDeliverySummary: latestSummary,
    latest_card: latestCard,
    latestCard,
    task_card: latestCard,
    taskCard: latestCard,
  });
  const testAgentPlanStatus = independentReviewStatus ? null : summarizeGroupStatusTestAgentExecutionPlan({ test_agent_execution_plan_summary: testAgentExecutionPlanSummary?.summary, test_agent_execution_plan: testAgentExecutionPlanSummary?.plan });
  const openQa = (input.agentQa || []).filter((item: any) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual"].includes(String(item?.status || "")));
  const blockers = [
    ...(Array.isArray(latestCard?.blockers) ? latestCard.blockers : []),
    ...(Array.isArray(latestSummary?.blockers) ? latestSummary.blockers : []),
  ].map((item: any) => compactGroupStatusText(item, 120)).filter(Boolean).slice(0, 5);
  const needs = [
    ...(Array.isArray(latestSummary?.needs) ? latestSummary.needs : []),
    ...(Array.isArray(latestSummary?.remaining_items) ? latestSummary.remaining_items : []),
    ...(Array.isArray(latestCard?.delivery?.risks) ? latestCard.delivery.risks : []),
  ].map((item: any) => compactGroupStatusText(item, 120)).filter(Boolean).slice(0, 5);
  return {
    schema: "ccm-group-main-agent-status-v1",
    group_id: input.groupId,
    phase: independentReviewStatus?.blocking
      ? (independentReviewStatus.status === "needs_user" ? "needs_user" : "reworking")
      : testAgentPlanStatus ? "reviewing"
      : latestStatusMeta.terminal ? latestStatusMeta.phase : latestCard?.phase || latestStatusMeta.phase,
    label: independentReviewStatus?.blocking
      ? (independentReviewStatus.status === "needs_user" ? "等待你确认" : "返工中")
      : testAgentPlanStatus
        ? (testAgentPlanStatus.status === "blocked" ? "复核计划需修复" : "复核准备中")
      : latestStatusMeta.terminal
        ? completionSummary?.status_label || latestStatusMeta.label
        : latestCard?.phase_label || latestStatusMeta.label,
    task_id: latestTask?.id || "",
    latest_task_title: latestTask?.title || "",
    active_task_count: activeTasks.length,
    running_child_agents: (childAgentStatusSummary?.running_agents?.length ? childAgentStatusSummary.running_agents : runningAgents).slice(0, 8),
    current_todo_summary: currentTodoSummary,
    currentTodoSummary,
    progress_refresh_summary: progressRefreshSummary,
    progressRefreshSummary,
    child_agent_status_summary: childAgentStatusSummary,
    childAgentStatusSummary,
    open_qa_count: openQa.length,
    latest_progress_checkpoint: latestCheckpoint ? { ...latestCheckpoint, at: latestCheckpoint.at || latestTask?.updated_at || "" } : null,
    recent_progress_checkpoints: meaningfulCheckpoints.slice(-3),
    progress_checkpoints: checkpointItems.slice(-6),
    completion_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? null : completionSummary,
    independent_review_summary: independentReviewSummary,
    independentReviewSummary: independentReviewSummary,
    test_agent_review_summary: independentReviewSummary,
    testAgentReviewSummary: independentReviewSummary,
    test_agent_execution_plan_summary: testAgentExecutionPlanSummary?.summary || null,
    testAgentExecutionPlanSummary: testAgentExecutionPlanSummary?.summary || null,
    pickup_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? null : pickupSummary,
    pickupSummary: independentReviewStatus?.blocking || testAgentPlanStatus ? null : pickupSummary,
    latest_delivery_summary: latestTask?.delivery_summary ? {
      ...latestTask.delivery_summary,
      progress_checkpoints: checkpointSource || undefined,
      completion_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? undefined : completionSummary || undefined,
      independent_review_summary: independentReviewSummary || latestTask.delivery_summary.independent_review_summary,
      independentReviewSummary: independentReviewSummary || latestTask.delivery_summary.independentReviewSummary,
      test_agent_review_summary: independentReviewSummary || latestTask.delivery_summary.test_agent_review_summary,
      testAgentReviewSummary: independentReviewSummary || latestTask.delivery_summary.testAgentReviewSummary,
      test_agent_execution_plan_summary: testAgentExecutionPlanSummary?.summary || latestTask.delivery_summary.test_agent_execution_plan_summary,
      testAgentExecutionPlanSummary: testAgentExecutionPlanSummary?.summary || latestTask.delivery_summary.testAgentExecutionPlanSummary,
      pickup_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? undefined : pickupSummary || undefined,
      progress_refresh_summary: progressRefreshSummary || undefined,
    } : null,
    failed_gates: latestSummary?.acceptance_gate?.failed_checks || latestSummary?.failed_gates || [],
    blockers,
    needs,
    updated_at: latestTask?.updated_at || new Date().toISOString(),
  };
}

const GROUP_PROGRESS_STATUS_TOPIC_PATTERN = /(?:任务状态|当前状态|现在状态|状态怎么样|进度|进展|做到哪|做到哪儿|做到哪了|完成了吗|完成了没|好了吗|有结果了吗|结果出来了吗|现在怎么样|怎么样了|how'?s it going|progress|status)/i;
const GROUP_PROGRESS_STATUS_MUTATION_PATTERN = /(?:设置|修改|标记|改成|更新|创建|新建|删除|移除|归档|取消|停止|恢复|重试)/;
const GROUP_PROGRESS_STATUS_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|<task-notification>|receipt-status|trace_id|session_id|WorkerContextPacket|raw payload/i;

export function isGroupProgressStatusRequest(message: any) {
  const text = String(message || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (!GROUP_PROGRESS_STATUS_TOPIC_PATTERN.test(text)) return false;
  if (GROUP_PROGRESS_STATUS_MUTATION_PATTERN.test(text) && /(?:任务状态|当前状态|状态|status)/i.test(text)) return false;
  return true;
}

function cleanGroupStatusFollowupText(value: any, fallback: string, max = 180) {
  const text = compactGroupStatusText(value, max);
  const fallbackText = sanitizeMainAgentDeliveryText(fallback, fallback, max);
  if (!text) return fallbackText;
  if (GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(text)) return fallbackText;
  return sanitizeMainAgentDeliveryText(text, fallback, max);
}

function joinGroupStatusItems(items: any[], fallback = "") {
  const values = (Array.isArray(items) ? items : [])
    .map((item: any) => cleanGroupStatusFollowupText(item, "", 120))
    .filter(Boolean)
    .slice(0, 3);
  return values.length ? values.join("；") : fallback;
}

function groupChildAgentStatus(value: any) {
  const text = String(value || "").toLowerCase();
  if (["done", "completed", "complete", "success", "succeeded", "ok", "passed"].includes(text)) return "completed";
  if (["failed", "fail", "error", "rejected"].includes(text)) return "failed";
  if (["blocked", "needs_attention", "needs_rework", "needs_followup", "missing_receipt"].includes(text)) return "blocked";
  if (["running", "in_progress", "executing", "active", "reviewing", "reworking"].includes(text)) return "running";
  if (["pending", "queued", "waiting", "wait", "assigned"].includes(text)) return "pending";
  return text ? "running" : "pending";
}

function groupChildAgentStatusLabel(status: string) {
  if (status === "completed") return "已回传结果";
  if (status === "failed") return "失败";
  if (status === "blocked") return "待补齐";
  if (status === "running") return "处理中";
  return "等待中";
}

function groupChildStatusPriority(status: string) {
  if (status === "failed") return 5;
  if (status === "blocked") return 4;
  if (status === "running") return 3;
  if (status === "completed") return 2;
  if (status === "pending") return 1;
  return 0;
}

function normalizeGroupChildAgentRow(row: any, fallbackStatus = "pending") {
  if (!row || typeof row !== "object") return null;
  const agent = cleanGroupStatusFollowupText(
    row.agent || row.project || row.target || row.owner || row.name,
    "",
    80,
  );
  if (!agent) return null;
  const status = groupChildAgentStatus(row.status || row.state || row.phase || fallbackStatus);
  const detail = cleanGroupStatusFollowupText(
    row.summary || row.current_focus || row.currentFocus || row.detail || row.reason || row.task || row.subject || "",
    "",
    150,
  );
  const filesCount = Number(row.files_changed_count || row.filesChangedCount || row.file_count || row.fileCount || 0) || 0;
  const verificationCount = Number(row.verification_count || row.verificationCount || 0) || 0;
  return {
    agent,
    status,
    status_label: groupChildAgentStatusLabel(status),
    detail,
    files_changed_count: filesCount,
    verification_count: verificationCount,
  };
}

function buildGroupChildAgentStatusSummary(latestCard: any, latestSummary: any, latestStatusMeta: any) {
  const rawRows: any[] = [];
  const progressSummary = latestCard?.agent_progress_summary
    || latestCard?.agentProgressSummary
    || latestCard?.technical?.agent_progress_summary
    || latestCard?.technical?.agentProgressSummary
    || latestSummary?.agent_progress_summary
    || latestSummary?.agentProgressSummary
    || null;
  if (Array.isArray(progressSummary?.rows)) rawRows.push(...progressSummary.rows);
  const receiptStatuses = Array.isArray(latestSummary?.receipt_statuses) ? latestSummary.receipt_statuses : [];
  for (const item of receiptStatuses) {
    rawRows.push({
      agent: item?.agent || item?.project || item?.target,
      status: item?.status === "done" ? "completed" : item?.status || "blocked",
      summary: item?.summary || item?.reason || "",
    });
  }
  const assignments = Array.isArray(latestSummary?.assignment_evidence) ? latestSummary.assignment_evidence : [];
  for (const item of assignments) {
    rawRows.push({
      agent: item?.project || item?.agent || item?.target,
      status: latestStatusMeta?.terminal ? "completed" : "pending",
      task: item?.task || item?.reason || "",
    });
  }
  const normalized = rawRows
    .map(row => normalizeGroupChildAgentRow(row, latestStatusMeta?.terminal ? "completed" : "pending"))
    .filter(Boolean);
  if (!normalized.length) return null;
  const byAgent = new Map<string, any>();
  for (const row of normalized) {
    const existing = byAgent.get(row.agent);
    if (!existing || groupChildStatusPriority(row.status) >= groupChildStatusPriority(existing.status)) {
      byAgent.set(row.agent, {
        ...existing,
        ...row,
        detail: row.detail || existing?.detail || "",
        files_changed_count: Math.max(Number(existing?.files_changed_count || 0), Number(row.files_changed_count || 0)),
        verification_count: Math.max(Number(existing?.verification_count || 0), Number(row.verification_count || 0)),
      });
    }
  }
  const rows = [...byAgent.values()].slice(0, 12);
  const namesFor = (statuses: string[]) => rows.filter(row => statuses.includes(row.status)).map(row => row.agent).slice(0, 6);
  const completedAgents = namesFor(["completed"]);
  const runningAgents = namesFor(["running"]);
  const waitingAgents = namesFor(["pending"]);
  const attentionAgents = namesFor(["failed", "blocked"]);
  const summaryParts = [
    completedAgents.length ? `已回传：${completedAgents.join("、")}` : "",
    runningAgents.length ? `处理中：${runningAgents.join("、")}` : "",
    waitingAgents.length ? `等待中：${waitingAgents.join("、")}` : "",
    attentionAgents.length ? `待补齐：${attentionAgents.join("、")}` : "",
  ].filter(Boolean);
  const status = attentionAgents.length
    ? "needs_attention"
    : runningAgents.length || waitingAgents.length
      ? "waiting"
      : "completed";
  return {
    schema: "ccm-group-child-agent-status-summary-v1",
    title: "执行成员等待情况",
    status,
    status_label: status === "completed" ? "已收齐" : status === "needs_attention" ? "需补齐" : "等待中",
    rows,
    completed_agents: completedAgents,
    running_agents: runningAgents,
    waiting_agents: waitingAgents,
    attention_agents: attentionAgents,
    summary_text: summaryParts.length ? summaryParts.join("；") : "暂无可展示的执行成员状态。",
    next_action: status === "completed"
      ? "我会把已收齐的结果合并进验收和最终总结。"
      : status === "needs_attention"
        ? "我会优先处理待补齐的结果说明、验证证据或阻塞项。"
        : "我会继续等待执行成员返回可验收结果，不会提前编造结论。",
    display_policy: {
      user_visible: true,
      task_card_visible: false,
      todo_visible: false,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

function groupStatusNextAction(status: any) {
  const phase = String(status?.phase || "").toLowerCase();
  if (!status?.task_id) return "你可以直接分派一个新需求，我会先整理计划，再进入执行和验收。";
  if (["completed", "done", "success"].includes(phase)) return "可以查看任务卡里的交付总结，或者继续补充新的要求。";
  if (["failed"].includes(phase)) return "请先看未完成原因；如果要继续，我会按缺口重新派发或返工。";
  if (["cancelled", "canceled"].includes(phase)) return "任务已经停止；如需继续，请重新说明希望恢复的范围。";
  if (["reworking"].includes(phase)) return "我会让原执行成员按失败点或复核缺口返工，修复后重新验收和总结。";
  if (["needs_user"].includes(phase)) return "当前需要你确认或补充信息，确认后我才会继续推进。";
  if (["queued", "pending"].includes(phase)) return "任务已在队列中，等执行通道开始后会继续更新任务卡。";
  if (status?.child_agent_status_summary?.status === "needs_attention") return "我会先处理待补齐的执行成员结果说明、验证证据或阻塞项。";
  if (Array.isArray(status?.running_child_agents) && status.running_child_agents.length) return "我会等执行成员返回可验收结果后再汇总，不会提前编造结果。";
  return "我会继续检查任务卡里的结果说明、验证证据和阻塞项。";
}

function buildGroupStatusCurrentTodoFollowup(status: any) {
  const todo = status?.current_todo_summary || status?.currentTodoSummary || null;
  if (!todo) return null;
  const active = cleanGroupStatusFollowupText(todo.active_form || todo.activeForm || todo.label, "", 160);
  const detail = cleanGroupStatusFollowupText(todo.detail, "", 160);
  const recent = cleanGroupStatusFollowupText(todo.recent_action || todo.recentAction, "", 140);
  const next = cleanGroupStatusFollowupText(todo.next_action || todo.nextAction, "", 180);
  if (!active && !detail && !recent && !next) return null;
  return {
    schema: "ccm-group-status-current-todo-followup-v1",
    title: cleanGroupStatusFollowupText(todo.title, "当前 Todo", 80),
    headline: active || detail || "我正在推进当前 Todo。",
    detail,
    recent_action: recent,
    next_action: next,
    status_label: cleanGroupStatusFollowupText(todo.status_label || todo.statusLabel, "进行中", 60),
    display_policy: {
      user_visible: true,
      task_card_visible: false,
      todo_visible: false,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

function buildGroupStatusUserActionSummary(status: any) {
  const phase = String(status?.phase || "").toLowerCase();
  const todo = status?.current_todo_summary || status?.currentTodoSummary || null;
  const rawNeedsAction = todo?.needs_action || todo?.needsAction || "";
  const needsAction = groupTodoTextNeedsUserAction(rawNeedsAction, phase)
    ? cleanGroupStatusFollowupText(rawNeedsAction, "", 180)
    : "";
  const needs = Array.isArray(status?.needs) ? status.needs : [];
  const blockers = Array.isArray(status?.blockers) ? status.blockers : [];
  const phaseNeedsUser = groupStatusPhaseNeedsUserAction(status);
  const userNeeds = needs.filter((item: any) => groupTodoTextNeedsUserAction(item, phase));
  const userBlockers = blockers.filter((item: any) => groupTodoTextNeedsUserAction(item, phase));
  const openQaCount = Number(status?.open_qa_count || 0);
  if (phaseNeedsUser || needsAction || openQaCount > 0 || userNeeds.length || userBlockers.length) {
    const headline = phaseNeedsUser
      ? "当前需要你确认或补充信息，我确认后才会继续推进。"
      : needsAction
        ? needsAction
        : openQaCount > 0
          ? `还有 ${openQaCount} 个问答需要你处理。`
          : userBlockers.length
            ? cleanGroupStatusFollowupText(userBlockers[0], "有阻塞项需要你处理。", 160)
            : cleanGroupStatusFollowupText(userNeeds[0], "还有信息需要你补齐。", 160);
    const actionItems = [
      needsAction,
      openQaCount > 0 ? `处理 ${openQaCount} 个待确认问答` : "",
      ...userBlockers,
      ...userNeeds,
    ]
      .map((item: any) => cleanGroupStatusFollowupText(item, "", 120))
      .filter(Boolean)
      .filter((item: string, index: number, arr: string[]) => arr.indexOf(item) === index)
      .slice(0, 4);
    return {
      schema: "ccm-group-status-user-action-summary-v1",
      title: "需要你处理",
      headline,
      action_items: actionItems,
      next_action: actionItems[0] || headline,
      display_policy: {
        user_visible: true,
        task_card_visible: false,
        todo_visible: false,
        technical_details_default_collapsed: true,
        hide_internal_protocols: true,
      },
    };
  }
  return null;
}

export function buildGroupStatusFollowupSummary(input: {
  groupId?: string;
  status?: any;
  tasks?: any[];
  agentQa?: any[];
  getRuntime?: (task: any) => any;
}) {
  const status = input.status || buildGroupMainAgentStatus({
    groupId: String(input.groupId || ""),
    tasks: input.tasks || [],
    agentQa: input.agentQa || [],
    getRuntime: input.getRuntime || (() => null),
  });
  const lines: string[] = [];
  const latestTitle = cleanGroupStatusFollowupText(status.latest_task_title, "这项任务", 120);
  const independentReview = summarizeGroupStatusIndependentReview(status);
  const testAgentPlan = independentReview ? null : summarizeGroupStatusTestAgentExecutionPlan(status);
  const label = independentReview?.blocking
    ? (independentReview.status === "needs_user" ? "等待你确认" : "返工中")
    : testAgentPlan
      ? (testAgentPlan.status === "blocked" ? "复核计划需修复" : "复核准备中")
    : cleanGroupStatusFollowupText(status.label, "正在处理", 80);
  const latestCheckpoint = status.latest_progress_checkpoint || null;
  const completion = status.completion_summary || null;
  const pickup = status.pickup_summary
    || status.pickupSummary
    || status.latest_delivery_summary?.pickup_summary
    || status.latestDeliverySummary?.pickupSummary
    || null;
  const progressRefresh = status.progress_refresh_summary
    || status.progressRefreshSummary
    || status.latest_delivery_summary?.progress_refresh_summary
    || status.latestDeliverySummary?.progressRefreshSummary
    || null;
  const currentTodoFollowup = status.current_todo_followup
    || status.currentTodoFollowup
    || buildGroupStatusCurrentTodoFollowup(status);
  const userActionSummary = status.user_action_summary
    || status.userActionSummary
    || buildGroupStatusUserActionSummary(status);

  if (!status.task_id) {
    lines.push("当前群聊还没有正在跟踪的开发任务。");
  } else {
    lines.push(`最近群聊任务进展：${latestTitle}，当前状态是${label}。`);
  }

  if (independentReview?.blocking) {
    lines.push(`当前进展：${independentReview.headline}。`);
  } else if (testAgentPlan) {
    lines.push(`当前进展：${testAgentPlan.headline}。`);
  } else if (latestCheckpoint?.label) {
    const checkpointLabel = cleanGroupStatusFollowupText(latestCheckpoint.label, "我已更新进展", 120);
    const checkpointDetail = cleanGroupStatusFollowupText(latestCheckpoint.detail, "", 160);
    lines.push(`当前进展：${checkpointLabel}${checkpointDetail ? `，${checkpointDetail}` : ""}。`);
  } else if (status.task_id) {
    lines.push("当前进展：我已记录任务，但还没有新的可展示节点。");
  }

  if (completion?.headline && !independentReview?.blocking) {
    lines.push(`交付总结：${cleanGroupStatusFollowupText(completion.headline, "我已整理阶段总结。", 200)}`);
  }

  if (currentTodoFollowup?.headline && !completion && !independentReview?.blocking) {
    const todoBits = [
      currentTodoFollowup.headline,
      currentTodoFollowup.detail && currentTodoFollowup.detail !== currentTodoFollowup.headline ? currentTodoFollowup.detail : "",
    ].filter(Boolean).join("，");
    lines.push(`${cleanGroupStatusFollowupText(currentTodoFollowup.title, "当前 Todo", 80)}：${cleanGroupStatusFollowupText(todoBits, "我正在推进当前 Todo。", 220)}`);
  }
  if (currentTodoFollowup?.recent_action && !completion && !independentReview?.blocking) {
    lines.push(`刚完成：${cleanGroupStatusFollowupText(currentTodoFollowup.recent_action, "上一项 Todo 已完成。", 160)}。`);
  }

  if (!independentReview?.blocking && (pickup?.current_state || pickup?.currentState || pickup?.headline)) {
    const pickupState = cleanGroupStatusFollowupText(pickup.current_state || pickup.currentState || pickup.headline, "我已整理当前任务状态。", 220);
    lines.push(`${cleanGroupStatusFollowupText(pickup.title, "回来继续看这里", 80)}：${pickupState}`);
  }
  const pickupReviewItems = Array.isArray(pickup?.review_items || pickup?.reviewItems)
    ? (pickup.review_items || pickup.reviewItems)
      .map((item: any) => cleanGroupStatusFollowupText(item, "", 120))
      .filter(Boolean)
      .slice(0, 4)
    : [];
  if (pickupReviewItems.length && !independentReview?.blocking) {
    lines.push(`回看要点：${pickupReviewItems.join("；")}。`);
  }

  if (progressRefresh?.headline || progressRefresh?.current_state || progressRefresh?.currentState) {
    const refreshState = cleanGroupStatusFollowupText(
      progressRefresh.current_state || progressRefresh.currentState || progressRefresh.headline,
      "我已整理进度刷新状态。",
      220,
    );
    lines.push(`${cleanGroupStatusFollowupText(progressRefresh.title, "进度刷新提醒", 80)}：${refreshState}`);
  }
  const progressReviewItems = Array.isArray(progressRefresh?.review_items || progressRefresh?.reviewItems)
    ? (progressRefresh.review_items || progressRefresh.reviewItems)
      .map((item: any) => cleanGroupStatusFollowupText(item, "", 120))
      .filter(Boolean)
      .slice(0, 4)
    : [];
  if (progressReviewItems.length) {
    lines.push(`接续要点：${progressReviewItems.join("；")}。`);
  }

  if (independentReview) {
    lines.push(`独立复核：${independentReview.statusLabel}${independentReview.headline ? `，${independentReview.headline}` : ""}`);
  }
  if (independentReview?.rows?.length) {
    lines.push(`复核要点：${independentReview.rows.join("；")}。`);
  }
  if (testAgentPlan) {
    lines.push(`TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}`);
  }
  if (testAgentPlan?.rows?.length) {
    lines.push(`计划要点：${testAgentPlan.rows.join("；")}。`);
  }

  const childAgentSummary = status.child_agent_status_summary || status.childAgentStatusSummary || null;
  if (childAgentSummary?.summary_text) {
    lines.push(`执行成员等待情况：${cleanGroupStatusFollowupText(childAgentSummary.summary_text, "执行成员状态已整理。", 220)}。`);
  }
  if (Array.isArray(childAgentSummary?.rows) && childAgentSummary.rows.length) {
    const details = childAgentSummary.rows
      .filter((row: any) => ["running", "pending", "failed", "blocked"].includes(String(row?.status || "")))
      .slice(0, 4)
      .map((row: any) => {
        const agent = cleanGroupStatusFollowupText(row.agent, "执行成员", 80);
        const label = cleanGroupStatusFollowupText(row.status_label || groupChildAgentStatusLabel(row.status), "处理中", 60);
        const detail = cleanGroupStatusFollowupText(row.detail, "", 120);
        return `${agent} ${label}${detail ? `：${detail}` : ""}`;
      })
      .filter(Boolean);
    if (details.length) lines.push(`正在等待/处理：${details.join("；")}。`);
  }

  const runningAgents = Array.isArray(status.running_child_agents) ? status.running_child_agents.filter(Boolean) : [];
  if (!childAgentSummary && runningAgents.length) {
    lines.push(`执行成员：${runningAgents.slice(0, 4).join("、")} 正在处理。`);
  } else if (!childAgentSummary && status.task_id && !completion) {
    lines.push("执行成员：当前没有正在运行的执行成员。");
  }

  if (Number(status.open_qa_count || 0) > 0) {
    lines.push(`待确认：还有 ${Number(status.open_qa_count || 0)} 个待确认问答需要你确认。`);
  }

  if (userActionSummary?.headline) {
    lines.push(`${cleanGroupStatusFollowupText(userActionSummary.title, "需要你处理", 80)}：${cleanGroupStatusFollowupText(userActionSummary.headline, "当前需要你确认或补充信息。", 220)}`);
  }
  if (Array.isArray(userActionSummary?.action_items) && userActionSummary.action_items.length) {
    lines.push(`你可以处理：${userActionSummary.action_items.map((item: any) => cleanGroupStatusFollowupText(item, "", 120)).filter(Boolean).slice(0, 4).join("；")}。`);
  }

  const blockers = joinGroupStatusItems(status.blockers, "");
  const needs = joinGroupStatusItems(status.needs, "");
  if (blockers) lines.push(`阻塞项：${blockers}。`);
  if (needs) lines.push(`还需要：${needs}。`);

  const pickupNextAction = cleanGroupStatusFollowupText(pickup?.resume_action || pickup?.resumeAction, "", 220);
  const progressRefreshNextAction = cleanGroupStatusFollowupText(progressRefresh?.next_action || progressRefresh?.nextAction, "", 220);
  const userActionNextAction = cleanGroupStatusFollowupText(userActionSummary?.next_action || userActionSummary?.nextAction, "", 220);
  const currentTodoNextAction = cleanGroupStatusFollowupText(currentTodoFollowup?.next_action || currentTodoFollowup?.nextAction, "", 220);
  const phaseNextAction = String(status?.phase || "").toLowerCase() === "reworking" ? groupStatusNextAction(status) : "";
  const reviewNextAction = independentReview?.blocking ? independentReview.nextAction : "";
  const planNextAction = testAgentPlan?.nextAction || "";
  const nextAction = reviewNextAction || planNextAction || userActionNextAction || currentTodoNextAction || pickupNextAction || phaseNextAction || progressRefreshNextAction || groupStatusNextAction(status);
  lines.push(`下一步：${nextAction}`);
  lines.push("我不会猜测还没返回的执行成员结果；底层记录默认收在任务卡的技术详情里。");

  const text = lines
    .map(line => cleanGroupStatusFollowupText(line, line, 260))
    .filter(Boolean)
    .join("\n");
  return {
    schema: "ccm-group-status-followup-summary-v1",
    kind: "group_status_followup",
    text,
    next_action: nextAction,
    status,
    display_policy: {
      user_visible: true,
      task_card_visible: false,
      todo_visible: false,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

export function runGroupStatusFollowupSelfTest() {
  const mockStatus = {
    schema: "ccm-group-main-agent-status-v1",
    phase: "executing",
    label: "正在处理",
    task_id: "task_demo",
    latest_task_title: "优化协作群工作链路",
    running_child_agents: ["web", "api"],
    child_agent_status_summary: {
      schema: "ccm-group-child-agent-status-summary-v1",
      title: "执行成员等待情况",
      status: "waiting",
      status_label: "等待中",
      completed_agents: ["web"],
      running_agents: ["api"],
      waiting_agents: ["qa"],
      attention_agents: ["docs"],
      summary_text: "已回传：web；处理中：api；等待中：qa；待补齐：docs",
      rows: [
        { agent: "web", status: "completed", status_label: "已回传结果", detail: "已提交结果说明" },
        { agent: "api", status: "running", status_label: "处理中", detail: "正在运行验证" },
        { agent: "qa", status: "pending", status_label: "等待中", detail: "等待派发" },
        { agent: "docs", status: "blocked", status_label: "待补齐", detail: "缺少验证证据" },
      ],
    },
    open_qa_count: 1,
    latest_progress_checkpoint: {
      label: "我已安排执行成员",
      detail: "等待 web 和 api 返回验证结果",
      status: "active",
    },
    blockers: ["CCM_AGENT_RECEIPT trace_id=abc"],
    needs: ["补齐验证证据"],
  };
  const summary = buildGroupStatusFollowupSummary({ status: mockStatus });
  const derivedStatus = buildGroupMainAgentStatus({
    groupId: "group-status-demo",
    tasks: [{
      id: "task-status-demo",
      group_id: "group-status-demo",
      title: "状态追问任务",
      status: "in_progress",
      updated_at: "2026-07-07T10:00:00.000Z",
      delivery_summary: {
        assignment_evidence: [{ project: "web", task: "修复登录态" }, { project: "api", task: "补接口验证" }],
        receipt_statuses: [{ agent: "web", status: "done", summary: "已完成登录态修复" }],
      },
    }],
    agentQa: [],
    getRuntime: () => ({
      taskCard: {
        live_todo_plan: {
          steps: [
            { id: "plan", content: "确认目标和范围", activeForm: "已确认目标和范围", status: "completed" },
            { id: "execute", content: "等待执行成员提交结果", activeForm: "正在等待执行成员提交结果", status: "in_progress" },
          ],
          next_action: "等待执行成员提交结果说明，然后我验收。",
        },
        agent_progress_summary: {
          rows: [
            { agent: "api", status: "running", current_focus: "正在验证接口" },
            { agent: "docs", status: "blocked", summary: "缺少验证证据" },
          ],
        },
      },
    }),
  });
  const derivedFollowup = buildGroupStatusFollowupSummary({ status: derivedStatus });
  const pickupStatus = buildGroupMainAgentStatus({
    groupId: "group-status-pickup-demo",
    tasks: [{
      id: "task-status-pickup-demo",
      group_id: "group-status-pickup-demo",
      title: "状态回看任务",
      status: "completed",
      updated_at: "2026-07-07T10:00:00.000Z",
      delivery_summary: {
        delivery_report: {
          schema: "ccm-main-agent-delivery-report-v1",
          title: "状态回看任务交付总结",
          status: "done",
          status_label: "已完成",
          headline: "状态回看任务已经完成。",
          files: ["frontend/src/demo.ts"],
          verification: ["npm test"],
          risks: [],
          next_action: "可以继续补充新的要求。",
          pickup_summary: {
            schema: "ccm-main-agent-pickup-summary-v1",
            title: "回来继续看这里",
            status: "done",
            status_label: "已完成",
            headline: "状态回看任务已经完成。",
            current_state: "可以直接查看完成内容；原始执行记录在技术详情里。",
            review_items: ["改动：frontend/src/demo.ts", "验证：npm test"],
            resume_action: "可以继续补充新的要求。",
          },
        },
      },
    }],
    agentQa: [],
    getRuntime: () => null,
  });
  const pickupFollowup = buildGroupStatusFollowupSummary({ status: pickupStatus });
  const progressRefreshStatus = buildGroupMainAgentStatus({
    groupId: "group-progress-refresh-demo",
    tasks: [{
      id: "task-progress-refresh-demo",
      group_id: "group-progress-refresh-demo",
      title: "长时间等待执行成员的任务",
      status: "in_progress",
      updated_at: "2020-01-01T00:00:00.000Z",
      work_items: [{
        id: "wi-web-stalled",
        target: "web",
        owner: "web",
        subject: "补齐筛选 UI 验证",
        status: "in_progress",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }],
      delivery_summary: {
        work_item_state: {
          last_requeue: { at: "2020-01-01T00:20:00.000Z", reason: "执行成员工作项长时间无进展" },
        },
      },
    }],
    agentQa: [],
    getRuntime: () => ({
      taskCard: {
        progress_checkpoints: {
          items: [
            { id: "cp-refresh-dispatch", label: "已派发给 web", detail: "等待 web 提交验证证据。", status: "active", at: "2020-01-01T00:00:00.000Z" },
          ],
        },
        agent_progress_summary: {
          rows: [{ agent: "web", status: "running", current_focus: "补齐筛选 UI 验证" }],
        },
      },
    }),
  });
  const progressRefreshFollowup = buildGroupStatusFollowupSummary({ status: progressRefreshStatus });
  const weakAcceptanceStatus = buildGroupMainAgentStatus({
    groupId: "group-weak-acceptance-status-demo",
    tasks: [{
      id: "task-weak-acceptance-status",
      group_id: "group-weak-acceptance-status-demo",
      title: "弱验收状态任务",
      status: "done",
      updated_at: "2026-07-09T10:00:00.000Z",
      completed_at: "2026-07-09T10:00:00.000Z",
      delivery_summary: {
        headline: "旧摘要声称已完成",
        acceptance_gate_passed: true,
        acceptance: ["验收结论：已通过"],
        delivery_report: {
          schema: "ccm-main-agent-delivery-report-v1",
          status: "done",
          status_label: "已完成",
          headline: "旧摘要声称已完成",
          acceptance: ["验收结论：已通过"],
          verification_evidence: { status: "ready", items: [] },
        },
      },
    }],
    agentQa: [],
    getRuntime: () => ({
      taskCard: {
        phase: "reviewing",
        phase_label: "验收中",
        delivery: { acceptance_passed: false },
        acceptance_review: { pass: false, missing: ["目标覆盖"], headline: "还缺 1 项证据，不能宣布完成" },
        mainAgentDecision: { verify: { passed: false } },
        live_todo_plan: {
          steps: [
            { id: "coordinator_review", content: "最终验收执行成员结果", activeForm: "我正在验收", status: "reviewing", detail: "最终验收缺少真实验证或复核证据" },
            { id: "final_delivery_report", content: "等待验收完成后生成交付报告", activeForm: "正在生成交付报告", status: "pending" },
          ],
          next_action: "补齐真实验证或复核证据后再总结。",
        },
        blockers: ["最终验收缺少真实验证或复核证据"],
      },
    }),
  });
  const weakAcceptanceFollowup = buildGroupStatusFollowupSummary({ status: weakAcceptanceStatus });
  const independentReviewStatus = buildGroupMainAgentStatus({
    groupId: "group-independent-review-status-demo",
    tasks: [{
      id: "task-independent-review-status",
      group_id: "group-independent-review-status-demo",
      title: "登录恢复复核",
      status: "completed",
      updated_at: "2026-07-09T11:00:00.000Z",
      delivery_summary: {
        headline: "任务已完成，可以查看改动详情。",
        independent_review_summary: {
          schema: "ccm-main-agent-independent-review-summary-v1",
          title: "独立复核",
          status: "needs_rework",
          status_label: "需返工",
          headline: "TestAgent 复核指出仍有未覆盖项，需要先返工。",
          rows: [
            "TestAgent：需返工",
            "待处理：验收条件未通过：登录恢复验证必须通过",
          ],
          next_action: "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。",
        },
        delivery_report: {
          schema: "ccm-main-agent-delivery-report-v1",
          status: "done",
          headline: "任务已完成，可以查看改动详情。",
          technical: {
            schema: "ccm-test-agent-report-v1",
            report_json: "C:/tmp/test-agent/report.json",
            artifact_manifest: "C:/tmp/test-agent/artifact-manifest.json",
          },
        },
      },
    }],
    agentQa: [],
    getRuntime: () => null,
  });
  const independentReviewFollowup = buildGroupStatusFollowupSummary({ status: independentReviewStatus });
  const testAgentPlanOnlyStatus = buildGroupMainAgentStatus({
    groupId: "group-test-agent-plan-only-status-demo",
    tasks: [{
      id: "task-test-agent-plan-only-status",
      group_id: "group-test-agent-plan-only-status-demo",
      title: "只生成 TestAgent 复核计划的群聊任务",
      status: "completed",
      updated_at: "2026-07-09T11:30:00.000Z",
      delivery_summary: {
        headline: "任务已完成，可以查看改动详情。",
        test_agent_execution_plan_summary: {
          schema: "ccm-test-agent-execution-plan-summary-v1",
          title: "TestAgent 复核计划",
          status: "ready",
          status_label: "可执行",
          headline: "TestAgent 已生成复核计划，我会按这份计划启动真实验证。",
          rows: [
            "复核范围：1 个项目",
            "浏览器检查：1 项",
          ],
          next_action: "启动 TestAgent 真实复核，并把结论纳入最终验收。",
        },
        delivery_report: {
          schema: "ccm-main-agent-delivery-report-v1",
          status: "done",
          headline: "任务已完成，可以查看改动详情。",
          technical: {
            test_agent_execution_plan: {
              artifactDir: "C:/tmp/test-agent-artifacts/group-plan-only",
              browser_har: "C:/tmp/test-agent-artifacts/group-plan-only/browser.har",
            },
          },
        },
      },
    }],
    agentQa: [],
    getRuntime: () => null,
  });
  const testAgentPlanOnlyFollowup = buildGroupStatusFollowupSummary({ status: testAgentPlanOnlyStatus });
  const testAgentFailureSummaryOnlyStatus = buildGroupMainAgentStatus({
    groupId: "group-test-agent-failure-summary-status-demo",
    tasks: [{
      id: "task-test-agent-failure-summary-only",
      group_id: "group-test-agent-failure-summary-status-demo",
      title: "登录恢复 TestAgent 复核",
      status: "completed",
      updated_at: "2026-07-09T12:00:00.000Z",
      delivery_summary: {
        headline: "任务已完成，可以查看改动详情。",
        delivery_report: {
          schema: "ccm-main-agent-delivery-report-v1",
          status: "done",
          headline: "任务已完成，可以查看改动详情。",
          technical: {
            schema: "ccm-test-agent-report-v1",
            test_agent_report: {
              schema: "ccm-test-agent-report-v1",
              status: "failed",
              recommendation: "rework",
              artifactDir: "C:/tmp/test-agent-artifacts/failure-summary-only",
              failureSummary: [{
                type: "browser",
                project: "web-app",
                title: "登录恢复浏览器复核",
                status: "failed",
                reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/failure-summary-only/screenshots/login.failure.png。",
                nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
                diagnostics: ["打开失败截图核对页面是否仍停留在登录态。"],
              }],
              metadata: {
                artifactFiles: {
                  reportMarkdownPath: "C:/tmp/test-agent-artifacts/failure-summary-only/report.md",
                  manifestPath: "C:/tmp/test-agent-artifacts/failure-summary-only/artifact-manifest.json",
                },
              },
            },
          },
        },
      },
    }],
    agentQa: [],
    getRuntime: () => null,
  });
  const testAgentFailureSummaryOnlyFollowup = buildGroupStatusFollowupSummary({ status: testAgentFailureSummaryOnlyStatus });
  const reworkStatus = buildGroupMainAgentStatus({
    groupId: "group-rework-status-demo",
    tasks: [{
      id: "task-status-completed-newer",
      group_id: "group-rework-status-demo",
      title: "较新的已完成任务",
      status: "done",
      updated_at: "2026-07-09T10:00:00.000Z",
      delivery_summary: { delivery_report: { status: "done", headline: "这项旧任务已完成。" } },
    }, {
      id: "task-status-rework",
      group_id: "group-rework-status-demo",
      title: "登录复核返工",
      status: "reworking",
      updated_at: "2026-07-08T10:00:00.000Z",
      delivery_summary: {},
    }],
    agentQa: [],
    getRuntime: (task: any) => task?.id === "task-status-rework" ? ({
      taskCard: {
        phase: "reworking",
        progress_checkpoints: {
          items: [
            { id: "cp-review-failed", label: "复核未通过", detail: "正在让原执行成员按失败点返工。", status: "active", at: "2026-07-08T10:00:00.000Z" },
          ],
        },
        agent_progress_summary: {
          rows: [{ agent: "web", status: "reworking", current_focus: "修复复核发现的问题" }],
        },
      },
    }) : null,
  });
  const reworkFollowup = buildGroupStatusFollowupSummary({ status: reworkStatus });
  const needsUserFollowup = buildGroupStatusFollowupSummary({
    status: {
      schema: "ccm-group-main-agent-status-v1",
      phase: "needs_user",
      label: "等待确认",
      task_id: "task-needs-user-demo",
      latest_task_title: "执行前计划确认",
      latest_progress_checkpoint: {
        label: "计划已整理",
        detail: "等待你确认影响范围后再派发执行成员",
        status: "warning",
      },
      current_todo_summary: {
        schema: "ccm-group-main-agent-current-todo-v1",
        recent_action: "已整理执行前计划",
        needs_action: "确认执行前计划，确认后才会派发执行成员。",
      },
      open_qa_count: 1,
      blockers: ["CCM_AGENT_RECEIPT trace_id=secret"],
      needs: ["确认影响范围仅限登录页"],
    },
  });
  const internalNeedsUserFollowup = buildGroupStatusFollowupSummary({
    status: {
      schema: "ccm-group-main-agent-status-v1",
      phase: "needs_user",
      label: "待补齐",
      task_id: "task-internal-needs-user-demo",
      latest_task_title: "内部验收补齐",
      latest_progress_checkpoint: {
        label: "验收证据不足",
        detail: "需要补齐真实验证或复核证据后再总结",
        status: "warning",
      },
      current_todo_summary: {
        schema: "ccm-group-main-agent-current-todo-v1",
        recent_action: "已发现验收证据不足",
        needs_action: "等待执行成员提交结果说明，然后我会验收并总结。",
        next_action: "补齐真实验证或复核证据后再总结。",
      },
      blockers: ["最终验收缺少真实验证或复核证据"],
      needs: ["补齐真实验证或复核证据"],
    },
  });
  const legacyAgentQaNeedsHandlingCopy = "Agent 问答" + "需要处理";
  const checks = {
    groupStatusFollowupRecognized: isGroupProgressStatusRequest("现在进展怎么样了？"),
    groupStatusFollowupAvoidsManagementMutation: !isGroupProgressStatusRequest("把任务状态设置为 done"),
    groupStatusFollowupFriendly: summary.text.includes("最近群聊任务进展") && summary.text.includes("下一步"),
    groupStatusFollowupShowsChildAgentWaitingState: summary.text.includes("执行成员等待情况")
      && summary.text.includes("已回传：web")
      && summary.text.includes("处理中：api")
      && summary.text.includes("待补齐：docs")
      && summary.text.includes("正在等待/处理")
      && !summary.text.includes("已完成：web"),
    groupStatusDerivesChildAgentRows: derivedStatus.child_agent_status_summary?.completed_agents?.includes("web")
      && derivedStatus.child_agent_status_summary?.running_agents?.includes("api")
      && derivedStatus.child_agent_status_summary?.attention_agents?.includes("docs")
      && derivedStatus.child_agent_status_summary?.rows?.some((row: any) => row.agent === "web" && row.status_label === "已回传结果")
      && derivedStatus.child_agent_status_summary?.summary_text?.includes("已回传：web")
      && !derivedStatus.child_agent_status_summary?.summary_text?.includes("已完成：web"),
    groupStatusCurrentTodoPostTurnVisible: derivedStatus.current_todo_summary?.recent_action === "已确认目标和范围"
      && !derivedStatus.current_todo_summary?.needs_action
      && derivedStatus.current_todo_summary?.next_action === "等待执行成员提交结果说明，然后我验收。"
      && derivedFollowup.text.includes("当前 Todo")
      && derivedFollowup.text.includes("等待执行成员提交结果说明，然后我验收")
      && !derivedFollowup.text.includes("需要你处理：等待执行成员提交结果说明"),
    groupStatusDerivesPickupSummary: pickupStatus.pickup_summary?.schema === "ccm-group-main-agent-pickup-summary-v1"
      && pickupStatus.pickup_summary?.title === "回来继续看这里"
      && pickupStatus.pickup_summary?.review_items?.some((item: string) => item.includes("frontend/src/demo.ts"))
      && pickupStatus.latest_delivery_summary?.pickup_summary?.display_policy?.technical_details_default_collapsed === true,
    groupStatusFollowupUsesPickupSummary: pickupFollowup.text.includes("回来继续看这里")
      && pickupFollowup.text.includes("回看要点")
      && pickupFollowup.text.includes("frontend/src/demo.ts")
      && pickupFollowup.next_action === "可以继续补充新的要求。",
    groupStatusShowsProgressRefreshSummary: progressRefreshStatus.progress_refresh_summary?.schema === "ccm-group-main-agent-progress-refresh-v1"
      && progressRefreshStatus.progress_refresh_summary?.title === "进度刷新提醒"
      && progressRefreshStatus.progress_refresh_summary?.review_items?.some((item: string) => item.includes("web"))
      && progressRefreshStatus.latest_delivery_summary?.progress_refresh_summary?.display_policy?.technical_details_default_collapsed === true,
    groupStatusFollowupUsesProgressRefreshSummary: progressRefreshFollowup.text.includes("进度刷新提醒")
      && progressRefreshFollowup.text.includes("接续要点")
      && progressRefreshFollowup.text.includes("补齐筛选 UI 验证")
      && !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(progressRefreshFollowup.text),
    groupStatusWeakAcceptanceStaysReviewing: weakAcceptanceStatus.phase === "reviewing"
      && weakAcceptanceStatus.label === "验收中"
      && weakAcceptanceStatus.completion_summary === null
      && weakAcceptanceStatus.pickup_summary === null
      && weakAcceptanceStatus.current_todo_summary?.step_id === "coordinator_review"
      && weakAcceptanceStatus.current_todo_summary?.status === "reviewing"
      && weakAcceptanceFollowup.text.includes("当前状态是验收中")
      && weakAcceptanceFollowup.text.includes("补齐真实验证或复核证据")
      && !weakAcceptanceFollowup.text.includes("需要你处理：最终验收缺少真实验证或复核证据")
      && !weakAcceptanceFollowup.text.includes("交付总结：旧摘要声称已完成"),
    groupStatusFollowupShowsIndependentReviewRework: independentReviewStatus.phase === "reworking"
      && independentReviewStatus.label === "返工中"
      && independentReviewStatus.completion_summary === null
      && independentReviewStatus.pickup_summary === null
      && independentReviewFollowup.text.includes("登录恢复复核，当前状态是返工中")
      && independentReviewFollowup.text.includes("独立复核：需返工")
      && independentReviewFollowup.text.includes("验收条件未通过：登录恢复验证必须通过")
      && independentReviewFollowup.text.includes("重新运行 TestAgent/独立复核")
      && !independentReviewFollowup.text.includes("任务已完成，可以查看改动详情")
      && !/ccm-test-agent-report-v1|report\.json|artifact-manifest|task-independent-review-status/i.test(independentReviewFollowup.text),
    groupStatusFollowupShowsTestAgentPlanOnly: testAgentPlanOnlyStatus.phase === "reviewing"
      && testAgentPlanOnlyStatus.label === "复核准备中"
      && testAgentPlanOnlyStatus.completion_summary === null
      && testAgentPlanOnlyStatus.pickup_summary === null
      && testAgentPlanOnlyFollowup.text.includes("只生成 TestAgent 复核计划的群聊任务，当前状态是复核准备中")
      && testAgentPlanOnlyFollowup.text.includes("TestAgent 计划：可执行")
      && testAgentPlanOnlyFollowup.text.includes("浏览器检查：1 项")
      && testAgentPlanOnlyFollowup.text.includes("启动 TestAgent 真实复核")
      && !testAgentPlanOnlyFollowup.text.includes("任务已完成，可以查看改动详情")
      && !/browser_har|test-agent-artifacts|C:\/tmp|task-test-agent-plan-only-status/i.test(testAgentPlanOnlyFollowup.text),
    groupStatusSynthesizesTestAgentFailureSummary: testAgentFailureSummaryOnlyStatus.phase === "reworking"
      && testAgentFailureSummaryOnlyStatus.label === "返工中"
      && testAgentFailureSummaryOnlyStatus.independent_review_summary?.rows?.some((item: string) => item.includes("返工重点") && item.includes("浏览器检查"))
      && testAgentFailureSummaryOnlyStatus.independent_review_summary?.rows?.some((item: string) => item.includes("排查建议") && item.includes("打开失败截图核对页面"))
      && testAgentFailureSummaryOnlyFollowup.text.includes("登录恢复 TestAgent 复核，当前状态是返工中")
      && testAgentFailureSummaryOnlyFollowup.text.includes("返工重点")
      && testAgentFailureSummaryOnlyFollowup.text.includes("排查建议")
      && testAgentFailureSummaryOnlyFollowup.text.includes("重新运行 TestAgent/独立复核")
      && !testAgentFailureSummaryOnlyFollowup.text.includes("任务已完成，可以查看改动详情")
      && !/ccm-test-agent-report-v1|report\.json|report\.md|artifact-manifest|test-agent-artifacts|C:\/tmp|task-test-agent-failure-summary-only/i.test(testAgentFailureSummaryOnlyFollowup.text),
    groupStatusFollowupShowsReworkState: reworkStatus.task_id === "task-status-rework"
      && reworkStatus.phase === "reworking"
      && reworkStatus.label === "返工中"
      && reworkFollowup.text.includes("登录复核返工")
      && reworkFollowup.text.includes("当前状态是返工中")
      && reworkFollowup.text.includes("重新验收和总结")
      && !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(reworkFollowup.text),
    groupStatusFollowupShowsUserActionSummary: needsUserFollowup.text.includes("需要你处理")
      && needsUserFollowup.text.includes("确认执行前计划")
      && needsUserFollowup.text.includes("处理 1 个待确认问答")
      && needsUserFollowup.text.includes("1 个待确认问答需要你确认")
      && !needsUserFollowup.text.includes(legacyAgentQaNeedsHandlingCopy)
      && needsUserFollowup.next_action.includes("确认执行前计划")
      && !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(needsUserFollowup.text),
    groupStatusFollowupAvoidsInternalNeedsUserAction: !internalNeedsUserFollowup.text.includes("需要你处理")
      && internalNeedsUserFollowup.text.includes("内部验收补齐")
      && internalNeedsUserFollowup.text.includes("补齐真实验证或复核证据")
      && !internalNeedsUserFollowup.text.includes("需要你处理：等待执行成员提交结果说明"),
    groupStatusFollowupHidesProtocol: !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(summary.text),
    groupStatusFollowupNoTodo: summary.display_policy.todo_visible === false && summary.display_policy.task_card_visible === false,
  };
  return { pass: Object.values(checks).every(Boolean), checks, sample: summary.text };
}

export function handleBasicGroupRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: UrlWithParsedQuery,
  ctx: any,
  deps: BasicGroupRouteDeps,
): boolean {
  const pathname = parsed.pathname;

  if (pathname === "/api/groups" && req.method === "GET") {
    sendJson(res, { groups: loadGroups() });
    return true;
  }

  if (pathname === "/api/groups/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, members } = JSON.parse(body);
        const groups = loadGroups();
        const id = "g" + Date.now().toString(36);
        const allMembers = Array.isArray(members) ? members : [];
        const group = normalizeGroupOrchestrator({
          id, name, members: allMembers,
          created_at: new Date().toISOString(),
        });
        groups.push(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/members" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, add, remove } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (add) {
          for (const m of add) {
            if (!group.members.find((x: any) => x.project === m.project)) {
              group.members.push(m);
            }
          }
        }
        if (remove) {
          const coordinatorProject = getCoordinatorMember(group).project;
          group.members = group.members.filter((m: any) => !remove.includes(m.project) || m.project === coordinatorProject || m.role === "coordinator");
        }
        normalizeGroupOrchestrator(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id } = JSON.parse(body);
        const groups = loadGroups().filter(g => g.id !== id);
        saveGroups(groups);
        try {
          fs.unlinkSync(path.join(GROUP_MESSAGES_DIR, `${id}.json`));
        } catch {}
        try {
          fs.unlinkSync(deps.getGroupMemoryFile(id));
        } catch {}
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/rename" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, name } = JSON.parse(body);
        if (!name || !name.trim()) return sendJson(res, { error: "群聊名称不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        group.name = name.trim();
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    const toolAuth = buildToolAuthorizationPayload(group.tools || {});
    sendJson(res, { tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, tools } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        const previousTools = normalizeToolAuthorization(group.tools || {});
        group.tools = normalizeToolAuthorization(tools);
        saveGroups(groups);
        const toolAuth = buildToolAuthorizationPayload(group.tools);
        const authorizationChange = recordToolAuthorizationChange({
          scope: "group",
          scopeId: group_id,
          previous: previousTools,
          next: group.tools,
          actor: "api",
          source: "/api/groups/tools",
          toolAudit: toolAuth.tool_audit,
          authorizationReadiness: toolAuth.authorization_readiness,
        });
        sendJson(res, { success: true, tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, authorization_change: authorizationChange });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    const before = JSON.stringify(group.shared_files || []);
    group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
    if (JSON.stringify(group.shared_files) !== before) saveGroups(groups);
    sendJson(res, { files: group.shared_files || [] });
    return true;
  }

  if (pathname === "/api/groups/shared/add" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name, content } = JSON.parse(body);
        if (!name || !content) return sendJson(res, { error: "文件名和内容不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        const existing = group.shared_files.findIndex((f: any) => f.name === name);
        if (existing >= 0) {
          group.shared_files[existing].content = content;
          group.shared_files[existing].type = "text";
          group.shared_files[existing].readable = true;
          group.shared_files[existing].updated_at = new Date().toISOString();
        } else {
          group.shared_files.push({
            name,
            type: "text",
            readable: true,
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        group.shared_files = group.shared_files.filter((f: any) => f.name !== name);
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/import" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, file_names } = JSON.parse(body);
        if (!file_names || !Array.isArray(file_names)) return sendJson(res, { error: "请提供文件名列表" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];

        let imported = 0;
        for (const name of file_names) {
          const filePath = ctx.getSharedFilePath(name);
          if (filePath && fs.existsSync(filePath)) {
            const record = ctx.createSharedFileRecord(name, "global");
            if (!record) continue;
            const existing = group.shared_files.findIndex((f: any) => f.name === name);
            if (existing >= 0) {
              group.shared_files[existing] = {
                ...group.shared_files[existing],
                ...record,
                created_at: group.shared_files[existing].created_at || record.created_at,
                updated_at: new Date().toISOString()
              };
            } else {
              group.shared_files.push(record);
            }
            imported++;
          }
        }
        saveGroups(groups);
        sendJson(res, { success: true, imported, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/messages" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const limit = parseInt(String(parsed.query.limit || "")) || 100;
    const groupIdText = String(groupId);
    const rawMessages = getGroupMessages(groupIdText).slice(-limit);
    const allTasks = loadTasks();
    const taskIds = new Set(rawMessages.map((message: any) => String(message?.task_id || message?.task?.id || "")).filter(Boolean));
    const taskMap = new Map(allTasks.filter((task: any) => taskIds.has(String(task.id))).map((task: any) => [String(task.id), task]));
    const runtimeMap = new Map<string, any>();
    const getRuntime = (task: any) => {
      const taskId = String(task?.id || "");
      if (!taskId) return null;
      if (!runtimeMap.has(taskId)) runtimeMap.set(taskId, deps.buildInlineTaskRuntime(task));
      return runtimeMap.get(taskId);
    };
    const messages = rawMessages.map((message: any) => {
      const taskId = String(message?.task_id || message?.task?.id || "");
      const task = taskMap.get(taskId);
      if (!task) return message;
      const runtime = getRuntime(task);
      return { ...message, taskRuntime: runtime, task_runtime: runtime };
    });
    const memory = deps.loadGroupMemory(groupIdText);
    const agentQa = deps.getAgentQaItemsForGroup(groupIdText, 100);
    const mainAgentStatus = buildGroupMainAgentStatus({ groupId: groupIdText, tasks: allTasks, agentQa, getRuntime });
    sendJson(res, { messages, memory, agentQa, mainAgentStatus });
    return true;
  }

  if (pathname === "/api/groups/messages/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const groupId = String(payload.id || payload.group_id || "").trim();
        if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const group = loadGroups().find((item: any) => item.id === groupId);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        const before = getGroupMessages(groupId).length;
        saveGroupMessages(groupId, []);
        if (payload.clear_memory === true || payload.clearMemory === true) {
          try { fs.unlinkSync(deps.getGroupMemoryFile(groupId)); } catch {}
        }
        sendJson(res, { success: true, cleared: before, memory_cleared: payload.clear_memory === true || payload.clearMemory === true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const project = parsed.query.project ? String(parsed.query.project) : "";
    const memory = deps.saveGroupMemory(String(groupId), deps.loadGroupMemory(String(groupId)));
    sendJson(res, {
      success: true,
      memory,
      context: deps.buildGroupMemoryContext(memory),
      agentPacket: project ? deps.buildAgentMemoryPacket(String(groupId), project) : "",
    });
    return true;
  }

  if (pathname === "/api/groups/logs" && req.method === "GET") {
    const groupId = parsed.query.id;
    const limit = parseInt(String(parsed.query.limit || "")) || 100;
    const category = parsed.query.category;

    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const logs = loadGroupLogs();
    let groupLogs = logs[String(groupId)] || [];
    if (category) {
      groupLogs = groupLogs.filter((l: any) => l.category === category);
    }
    sendJson(res, { logs: groupLogs.slice(-limit) });
    return true;
  }

  if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id } = JSON.parse(body);
        const logs = loadGroupLogs();
        delete logs[group_id];
        saveGroupLogs(logs);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);

    const logs = loadGroupLogs();
    const initialCount = (logs[String(groupId)] || []).length;
    let lastCount = initialCount;

    const interval = setInterval(() => {
      try {
        const currentLogs = loadGroupLogs();
        const groupLogs = currentLogs[String(groupId)] || [];

        if (groupLogs.length > lastCount) {
          const newLogs = groupLogs.slice(lastCount);
          for (const log of newLogs) {
            res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
          }
          lastCount = groupLogs.length;
        }
      } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
      }
    }, 1000);

    req.on("close", () => {
      clearInterval(interval);
    });
    return true;
  }

  return false;
}
