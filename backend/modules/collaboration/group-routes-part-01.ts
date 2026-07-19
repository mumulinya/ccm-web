// Behavior-freeze split from group-routes.ts (part 1/3).
import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson, GROUP_MESSAGES_DIR } from "../../core/utils";
import { loadTasks } from "../../core/db";
import {
  appendGroupMessage,
  archiveGroupChatSession,
  createGroupChatSession,
  deleteGroupChatSession,
  getActiveGroupChatSessionId,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  purgeLegacyDefaultGroupChatSession,
  pruneArchivedGroupChatSessions,
  renameGroupChatSession,
  saveGroupMessages,
  saveGroups,
  selectGroupChatSession,
} from "./storage";
import { clearGroupLogs, loadGroupLogs } from "./logs";
import { getCoordinatorMember, loadOrchestratorConfig, normalizeGroupOrchestrator } from "./group-orchestrator";
import { buildFreshToolAuthorizationPayload, buildToolAuthorizationPayload, normalizeToolAuthorization, recordToolAuthorizationChange } from "../../tools/tool-authorization";
import { sanitizeMainAgentDeliveryText } from "../../agents/delivery-report";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "./group-memory-compaction";
import { acknowledgeInvalidPendingModelCapabilityRefreshOutcome, buildModelCapabilityRefreshPlan, readInvalidPendingModelCapabilityRefreshOutcomes, readModelCapabilityCache, readModelCapabilityDowngradeAlerts, readModelCapabilityRefreshOutcomeLedger, readModelCapabilityRefreshStatus, recordModelCapabilityEvidence, revokeModelCapabilityEvidence, runModelCapabilityCacheMaintenance, summarizeModelCapabilityCache } from "./model-capability-cache";
import { readGroupSessionRetentionMaintenanceStatus, runGroupSessionRetentionMaintenance } from "./group-session-maintenance";

import {
  cleanGroupStatusFollowupText,
} from "./group-routes-part-02";

export type BasicGroupRouteDeps = {
  getGroupMemoryFile: (groupId: string, sessionId?: string) => string;
  loadGroupMemory: (groupId: string, sessionId?: string) => any;
  saveGroupMemory: (groupId: string, memory: any, sessionId?: string) => any;
  buildGroupMemoryContext: (memory: any) => string;
  buildAgentMemoryPacket: (groupId: string, project: string, task?: string, options?: any) => string;
  buildInlineTaskRuntime: (task: any) => any;
  getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
  deleteGroupSessionMemoryArtifacts?: (groupId: string, sessionId: string) => any;
};

const GROUP_MAIN_AGENT_PROGRESS_REFRESH_STALE_MS = 15 * 60 * 1000;
const GROUP_MESSAGE_RUNTIME_MAX_BYTES = 4 * 1024 * 1024;

const GROUP_MESSAGE_RUNTIME_OMIT_KEYS = new Set([
  "task_card",
  "displayStream",
  "planAlignment",
  "agentCoordination",
  "agentProgressSummary",
  "changeSummary",
  "receiptReworkSummary",
  "userHandoff",
  "runtimeKernel",
  "recoverySummary",
  "continuationStatus",
  "workItemClaimSummary",
  "workItemUnlockSummary",
  "completionReadinessSummary",
  "progressCheckpoints",
  "deliveryReport",
  "postReviewSpotCheckSummary",
  "completionCard",
  "pickupSummary",
  "technical",
  "runtime_kernel",
  "raw",
  "rawEvents",
  "raw_events",
  "payload",
  "metadata",
  "previousLedger",
  "previous_ledger",
  "coordinatorOutputPreview",
  "coordinator_output_preview",
  "testAgentHandoff",
  "test_agent_handoff",
  "testAgentReport",
  "test_agent_report",
  "workerContextPacket",
  "worker_context_packet",
  "workerHandoff",
  "worker_handoff",
  "runtimeToolSnapshot",
  "runtime_tool_snapshot",
  "receipts",
  "receipt",
  "executions",
]);

function compactGroupMessageRuntimeValue(value: any, depth = 0): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 4000 ? `${value.slice(0, 4000)}...` : value;
  if (typeof value !== "object") return value;
  if (depth >= 8) return Array.isArray(value) ? [] : {};
  if (Array.isArray(value)) return value.slice(0, 40).map(item => compactGroupMessageRuntimeValue(item, depth + 1));
  const result: any = {};
  for (const [key, item] of Object.entries(value)) {
    if (GROUP_MESSAGE_RUNTIME_OMIT_KEYS.has(key)) continue;
    if (key === "summary" && depth >= 2 && item && typeof item === "object") continue;
    result[key] = compactGroupMessageRuntimeValue(item, depth + 1);
  }
  return result;
}

export function compactGroupMessageTaskRuntime(runtime: any) {
  if (!runtime || typeof runtime !== "object") return runtime;
  const sourceCard = runtime.taskCard || runtime.task_card || null;
  const card = compactGroupMessageRuntimeValue(sourceCard);
  if (card && sourceCard?.technical) {
    const technical = sourceCard.technical;
    card.technical = {
      trace_id: technical.trace_id || "",
      execution_ids: Array.isArray(technical.execution_ids) ? technical.execution_ids.slice(0, 40) : [],
      session_ids: Array.isArray(technical.session_ids) ? technical.session_ids.slice(0, 40) : [],
      work_item_ids: Array.isArray(technical.work_item_ids) ? technical.work_item_ids.slice(0, 40) : [],
      entity_chain_endpoint: technical.entity_chain_endpoint || "",
      details_compacted: true,
    };
  }
  const compact = {
    taskId: runtime.taskId || runtime.task_id || "",
    status: runtime.status || "",
    statusText: compactGroupStatusText(runtime.statusText || runtime.status_text || "", 500),
    updatedAt: runtime.updatedAt || runtime.updated_at || "",
    lifecycle: compactGroupMessageRuntimeValue(runtime.lifecycle),
    reasoning: compactGroupMessageRuntimeValue(runtime.reasoning),
    counts: compactGroupMessageRuntimeValue(runtime.counts),
    agents: compactGroupMessageRuntimeValue(runtime.agents),
    sessions: compactGroupMessageRuntimeValue(runtime.sessions),
    taskCard: card,
  };
  const bytes = Buffer.byteLength(JSON.stringify(compact));
  if (bytes <= GROUP_MESSAGE_RUNTIME_MAX_BYTES) return compact;
  return {
    ...compact,
    taskCard: card ? {
      version: card.version,
      visible: card.visible,
      task_id: card.task_id,
      title: card.title,
      goal: card.goal,
      phase: card.phase,
      phase_label: card.phase_label,
      status: card.status,
      progress: card.progress,
      active_agents: card.active_agents,
      agents: card.agents,
      live_todo_plan: card.live_todo_plan,
      work_items: card.work_items,
      work_item_summary: card.work_item_summary,
      completion_readiness_summary: card.completion_readiness_summary,
      progress_checkpoints: card.progress_checkpoints,
      acceptance_review: card.acceptance_review,
      change_summary: card.change_summary,
      user_handoff: card.user_handoff,
      completed: card.completed,
      blockers: card.blockers,
      next_action: card.next_action,
      post_review_spot_check_summary: card.post_review_spot_check_summary,
      completion_card: card.completion_card,
      pickup_summary: card.pickup_summary,
      delivery: card.delivery,
      actions: card.actions,
      technical: card.technical,
      updated_at: card.updated_at,
    } : null,
  };
}

export function compactGroupStatusText(value: any, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function taskUpdatedMs(task: any) {
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

export function checkpointStatus(status: any) {
  const value = String(status || "").toLowerCase();
  if (["done", "completed", "ok", "success", "succeeded"].includes(value)) return "done";
  if (["active", "running", "in_progress", "reviewing", "reworking"].includes(value)) return "active";
  if (["warn", "warning", "blocked", "needs_confirmation", "cancelled", "canceled", "stopped"].includes(value)) return "warning";
  if (["fail", "failed", "error"].includes(value)) return "failed";
  return "pending";
}

export function groupTaskStatusMeta(status: any) {
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

export function groupDeliveryCheckpointLabel(status: any) {
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

export function groupTaskDisplayStatus(task: any, summary: any = {}, latestCard: any = null, rawStatus: any = "") {
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

export function buildGroupCompletionSummary(task: any, summary: any, latestCard: any = null) {
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

export function buildGroupPickupSummary(task: any, summary: any, completionSummary: any, latestCard: any = null) {
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

export function groupTodoTextNeedsUserAction(value: any, phase: any = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const phaseText = String(phase || "").toLowerCase();
  const userActionPattern = /(?:需要你|等你|等待你|请你|请确认|确认(?:是否|计划|范围|授权|影响|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|选择|授权|回复|上传|输入|填写|处理\s*\d+\s*个待确认问答|人工确认|待确认问答|是否允许|是否继续|允许继续|确认并继续)/i;
  if (userActionPattern.test(text)) return true;
  if (["needs_user", "waiting_user", "needs_confirmation"].includes(phaseText) && /确认(?:计划|范围|授权|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|回复|授权|选择|上传|输入|填写|处理\s*\d+\s*个待确认问答/.test(text)) return true;
  return false;
}

export function groupStatusPhaseNeedsUserAction(status: any) {
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

export function buildGroupCurrentTodoSummary(latestCard: any, latestTask: any, latestStatusMeta: any) {
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

export function buildGroupProgressRefreshSummary(
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

export function getGroupStatusIndependentReviewSummary(source: any = {}) {
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

export function summarizeGroupStatusIndependentReview(source: any = {}) {
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
      ? "独立复核发现未通过项。"
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

export function getGroupStatusTestAgentExecutionPlanSummary(source: any = {}) {
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

export function summarizeGroupStatusTestAgentExecutionPlan(source: any = {}) {
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
