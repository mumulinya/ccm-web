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
  return "主 Agent 已整理阶段总结";
}

function countGroupStatusItems(...values: any[]) {
  let count = 0;
  for (const value of values) {
    if (Array.isArray(value)) count = Math.max(count, value.length);
    else if (Number.isFinite(Number(value))) count = Math.max(count, Number(value));
  }
  return count;
}

function friendlyGroupCompletionText(value: any, fallback: string, max = 220) {
  const text = compactGroupStatusText(value, max);
  if (!text) return fallback;
  if (/CCM_AGENT_RECEIPT|trace[_-]?id|session[_-]?id|run[_-]?id|workflow_timeline|runtime kernel|raw_report|stack/i.test(text)) {
    return sanitizeMainAgentDeliveryText(text, fallback, max);
  }
  return sanitizeMainAgentDeliveryText(text, fallback, max);
}

function firstDeliverySectionItem(report: any, sectionId: string) {
  const section = Array.isArray(report?.sections)
    ? report.sections.find((item: any) => item?.id === sectionId || item?.title === sectionId)
    : null;
  return Array.isArray(section?.items) ? section.items.find(Boolean) : "";
}

function buildGroupCompletionSummary(task: any, summary: any) {
  const report = summary?.delivery_report || summary?.deliveryReport || null;
  const statusMeta = groupTaskStatusMeta(report?.status || summary?.status || task?.status);
  if (!task && !report) return null;
  if (!statusMeta.terminal && !report) return null;
  const status = statusMeta.deliveryStatus;
  const fallbackHeadline = status === "done"
    ? "任务已经完成，主 Agent 已整理交付结果。"
    : status === "failed"
      ? "任务还没有完成，主 Agent 已整理原因和下一步。"
      : status === "cancelled"
        ? "任务已取消，当前状态已整理。"
        : "主 Agent 已整理阶段性处理结果。";
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

function buildGroupPickupSummary(task: any, summary: any, completionSummary: any) {
  const report = summary?.delivery_report || summary?.deliveryReport || null;
  const existing = summary?.pickup_summary
    || summary?.pickupSummary
    || report?.pickup_summary
    || report?.pickupSummary
    || null;
  const statusMeta = groupTaskStatusMeta(existing?.status || report?.status || summary?.status || task?.status);
  if (!task && !existing && !report) return null;
  if (!existing && !report && !statusMeta.terminal) return null;
  const status = existing?.status || report?.status || completionSummary?.status || statusMeta.deliveryStatus;
  const headline = friendlyGroupCompletionText(
    existing?.headline || report?.headline || completionSummary?.headline || task?.status_detail || "",
    statusMeta.terminal ? "主 Agent 已整理本轮任务结果。" : "主 Agent 已整理当前任务状态。",
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
    statusMeta.terminal ? "可以查看交付总结，或继续补充新的要求。" : "主 Agent 会继续推进当前任务，并在完成后汇总给你。",
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

function buildGroupCurrentTodoSummary(latestCard: any, latestTask: any, latestStatusMeta: any) {
  if (!latestCard || latestStatusMeta?.terminal) return null;
  const todo = latestCard.live_todo_plan || latestCard.liveTodoPlan || latestCard.mainAgentDecision?.todo_plan || latestCard.main_agent_decision?.todo_plan || null;
  const steps = Array.isArray(todo?.steps) ? todo.steps.filter((item: any) => item?.content || item?.label || item?.activeForm || item?.active_form) : [];
  if (!steps.length) return null;
  const activeStatuses = new Set(["in_progress", "active", "running", "reviewing", "reworking", "needs_confirmation", "needs_user", "failed"]);
  const activeStep = steps.find((item: any) => activeStatuses.has(String(item?.status || "").toLowerCase()))
    || steps.find((item: any) => !["completed", "done", "cancelled", "canceled"].includes(String(item?.status || "").toLowerCase()))
    || steps[steps.length - 1];
  if (!activeStep) return null;
  const completedCount = steps.filter((item: any) => ["completed", "done", "success", "succeeded"].includes(String(item?.status || "").toLowerCase())).length;
  const status = String(activeStep.status || "pending").toLowerCase();
  const label = friendlyGroupCompletionText(activeStep.content || activeStep.label || "主 Agent 正在处理当前任务", "主 Agent 正在处理当前任务", 160);
  const activeForm = friendlyGroupCompletionText(activeStep.activeForm || activeStep.active_form || label, label, 160);
  const detail = friendlyGroupCompletionText(activeStep.detail || latestCard.next_action || latestTask?.status_detail || "", "", 220);
  return {
    schema: "ccm-group-main-agent-current-todo-v1",
    title: todo?.title || "当前 Todo",
    task_id: latestTask?.id || latestCard.task_id || latestCard.taskId || "",
    task_title: latestTask?.title || latestCard.title || "",
    step_id: activeStep.id || "",
    label,
    active_form: activeForm,
    detail,
    status,
    status_label: liveTodoStatusLabel(status),
    progress_label: `${completedCount}/${steps.length}`,
    completed_count: completedCount,
    total_count: steps.length,
    next_action: friendlyGroupCompletionText(latestCard.next_action || latestTask?.status_detail || "", "", 220),
    display_policy: { user_visible: true, technical_details_default_collapsed: true },
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
    row.subject || row.title || row.task || row.message || row.description || fallbackTask?.title || "子 Agent 工作项",
    "子 Agent 工作项",
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
    ? "主 Agent 已检测到卡住的子 Agent 工作项，并把它们放回可继续派发状态。"
    : stalledItems.length
      ? `${stalledItems.length} 个子 Agent 工作项长时间没有新进展，主 Agent 会先刷新状态，再决定继续等待、重派或定向补充。`
      : pendingTooLong
        ? `这项任务已排队 ${ageLabel || "一段时间"}，主 Agent 会检查执行通道并接上下一步。`
        : `这项任务已经 ${ageLabel || "一段时间"} 没有新的可展示进展，主 Agent 会主动刷新状态。`;
  const reviewItems = [
    latestCheckpoint?.label ? `最后进展：${latestCheckpoint.label}` : "",
    firstStalled ? `待确认：${firstStalled.target || "子 Agent"} 是否仍在处理「${firstStalled.subject}」` : "",
    firstNext ? `可接续：${firstNext.target || "子 Agent"}「${firstNext.subject}」` : "",
    childAgentStatusSummary?.summary_text ? `子 Agent 状态：${childAgentStatusSummary.summary_text}` : "",
    requeueMarker?.reason ? `恢复原因：${requeueMarker.reason}` : "",
  ].map(item => friendlyGroupCompletionText(item, "", 160)).filter(Boolean).slice(0, 5);
  const nextAction = friendlyGroupCompletionText(
    firstNext
      ? `优先接上 ${firstNext.target || "子 Agent"} 的「${firstNext.subject}」，完成后继续验收和总结。`
      : stalledItems.length
        ? "先确认子 Agent 是否还在执行；没有新结果就重新派发或定向补充。"
        : pendingTooLong
        ? "检查执行通道和队列状态，能恢复就继续推进；不能恢复会提示你处理。"
        : "刷新任务卡状态；如果没有新结果，会继续等待或补派。",
    "主 Agent 会刷新任务状态并接上下一步。",
    220,
  );
  return {
    schema: "ccm-group-main-agent-progress-refresh-v1",
    title: "进度刷新提醒",
    status: requeueMarker ? "requeued" : stalledItems.length || pendingTooLong ? "needs_refresh" : "watching",
    status_label: requeueMarker ? "已接续" : stalledItems.length || pendingTooLong ? "需要接续" : "刷新中",
    headline: friendlyGroupCompletionText(headline, "主 Agent 已整理当前进度刷新状态。", 240),
    current_state: friendlyGroupCompletionText(headline, "主 Agent 已整理当前进度刷新状态。", 240),
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

export function buildGroupMainAgentStatus(input: {
  groupId: string;
  tasks: any[];
  agentQa: any[];
  getRuntime: (task: any) => any;
}) {
  const groupTasks = (input.tasks || [])
    .filter((task: any) => String(task?.group_id || task?.groupId || "") === input.groupId)
    .filter((task: any) => !task?.archived && !task?.deleted_at)
    .sort((a: any, b: any) => taskUpdatedMs(b) - taskUpdatedMs(a));
  const activeTasks = groupTasks.filter((task: any) => ["pending", "queued", "in_progress", "running", "reviewing"].includes(String(task?.status || "")));
  const latestTask = activeTasks[0] || groupTasks[0] || null;
  const latestRuntime = latestTask ? input.getRuntime(latestTask) : null;
  const latestCard = latestRuntime?.taskCard || latestRuntime?.task_card || null;
  const latestSummary = latestTask?.delivery_summary || {};
  const latestStatusMeta = groupTaskStatusMeta(latestTask?.status || latestCard?.phase);
  const completionSummary = buildGroupCompletionSummary(latestTask, latestSummary);
  const pickupSummary = buildGroupPickupSummary(latestTask, latestSummary, completionSummary);
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
    phase: latestStatusMeta.terminal ? latestStatusMeta.phase : latestCard?.phase || latestStatusMeta.phase,
    label: latestStatusMeta.terminal
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
    completion_summary: completionSummary,
    pickup_summary: pickupSummary,
    pickupSummary,
    latest_delivery_summary: latestTask?.delivery_summary ? {
      ...latestTask.delivery_summary,
      progress_checkpoints: checkpointSource || undefined,
      completion_summary: completionSummary || undefined,
      pickup_summary: pickupSummary || undefined,
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
  if (!text) return fallback;
  if (GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(text)) return fallback;
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
  if (status === "completed") return "已完成";
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
    completedAgents.length ? `已完成：${completedAgents.join("、")}` : "",
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
    title: "子 Agent 等待情况",
    status,
    status_label: status === "completed" ? "已收齐" : status === "needs_attention" ? "需补齐" : "等待中",
    rows,
    completed_agents: completedAgents,
    running_agents: runningAgents,
    waiting_agents: waitingAgents,
    attention_agents: attentionAgents,
    summary_text: summaryParts.length ? summaryParts.join("；") : "暂无可展示的子 Agent 状态。",
    next_action: status === "completed"
      ? "主 Agent 会把已收齐的结果合并进验收和最终总结。"
      : status === "needs_attention"
        ? "主 Agent 会优先处理待补齐的结果说明、验证证据或阻塞项。"
        : "主 Agent 会继续等待子 Agent 返回可验收结果，不会提前编造结论。",
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
  if (["needs_user"].includes(phase)) return "当前需要你确认或补充信息，确认后主 Agent 才会继续推进。";
  if (["queued", "pending"].includes(phase)) return "任务已在队列中，等执行通道开始后会继续更新任务卡。";
  if (status?.child_agent_status_summary?.status === "needs_attention") return "我会先处理待补齐的子 Agent 结果说明、验证证据或阻塞项。";
  if (Array.isArray(status?.running_child_agents) && status.running_child_agents.length) return "我会等子 Agent 返回可验收结果后再汇总，不会提前编造结果。";
  return "主 Agent 会继续检查任务卡里的结果说明、验证证据和阻塞项。";
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
  const label = cleanGroupStatusFollowupText(status.label, "正在处理", 80);
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

  if (!status.task_id) {
    lines.push("当前群聊还没有正在跟踪的开发任务。");
  } else {
    lines.push(`最近群聊任务进展：${latestTitle}，当前状态是${label}。`);
  }

  if (latestCheckpoint?.label) {
    const checkpointLabel = cleanGroupStatusFollowupText(latestCheckpoint.label, "主 Agent 已更新进展", 120);
    const checkpointDetail = cleanGroupStatusFollowupText(latestCheckpoint.detail, "", 160);
    lines.push(`当前进展：${checkpointLabel}${checkpointDetail ? `，${checkpointDetail}` : ""}。`);
  } else if (status.task_id) {
    lines.push("当前进展：主 Agent 已记录任务，但还没有新的可展示节点。");
  }

  if (completion?.headline) {
    lines.push(`交付总结：${cleanGroupStatusFollowupText(completion.headline, "主 Agent 已整理阶段总结。", 200)}`);
  }

  if (pickup?.current_state || pickup?.currentState || pickup?.headline) {
    const pickupState = cleanGroupStatusFollowupText(pickup.current_state || pickup.currentState || pickup.headline, "主 Agent 已整理当前任务状态。", 220);
    lines.push(`${cleanGroupStatusFollowupText(pickup.title, "回来继续看这里", 80)}：${pickupState}`);
  }
  const pickupReviewItems = Array.isArray(pickup?.review_items || pickup?.reviewItems)
    ? (pickup.review_items || pickup.reviewItems)
      .map((item: any) => cleanGroupStatusFollowupText(item, "", 120))
      .filter(Boolean)
      .slice(0, 4)
    : [];
  if (pickupReviewItems.length) {
    lines.push(`回看要点：${pickupReviewItems.join("；")}。`);
  }

  if (progressRefresh?.headline || progressRefresh?.current_state || progressRefresh?.currentState) {
    const refreshState = cleanGroupStatusFollowupText(
      progressRefresh.current_state || progressRefresh.currentState || progressRefresh.headline,
      "主 Agent 已整理进度刷新状态。",
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

  const childAgentSummary = status.child_agent_status_summary || status.childAgentStatusSummary || null;
  if (childAgentSummary?.summary_text) {
    lines.push(`子 Agent 等待情况：${cleanGroupStatusFollowupText(childAgentSummary.summary_text, "子 Agent 状态已整理。", 220)}。`);
  }
  if (Array.isArray(childAgentSummary?.rows) && childAgentSummary.rows.length) {
    const details = childAgentSummary.rows
      .filter((row: any) => ["running", "pending", "failed", "blocked"].includes(String(row?.status || "")))
      .slice(0, 4)
      .map((row: any) => {
        const agent = cleanGroupStatusFollowupText(row.agent, "子 Agent", 80);
        const label = cleanGroupStatusFollowupText(row.status_label || groupChildAgentStatusLabel(row.status), "处理中", 60);
        const detail = cleanGroupStatusFollowupText(row.detail, "", 120);
        return `${agent} ${label}${detail ? `：${detail}` : ""}`;
      })
      .filter(Boolean);
    if (details.length) lines.push(`正在等待/处理：${details.join("；")}。`);
  }

  const runningAgents = Array.isArray(status.running_child_agents) ? status.running_child_agents.filter(Boolean) : [];
  if (!childAgentSummary && runningAgents.length) {
    lines.push(`子 Agent：${runningAgents.slice(0, 4).join("、")} 正在处理。`);
  } else if (!childAgentSummary && status.task_id && !completion) {
    lines.push("子 Agent：当前没有正在运行的子 Agent。");
  }

  if (Number(status.open_qa_count || 0) > 0) {
    lines.push(`待确认：还有 ${Number(status.open_qa_count || 0)} 个 Agent 问答需要处理。`);
  }

  const blockers = joinGroupStatusItems(status.blockers, "");
  const needs = joinGroupStatusItems(status.needs, "");
  if (blockers) lines.push(`阻塞项：${blockers}。`);
  if (needs) lines.push(`还需要：${needs}。`);

  const pickupNextAction = cleanGroupStatusFollowupText(pickup?.resume_action || pickup?.resumeAction, "", 220);
  const progressRefreshNextAction = cleanGroupStatusFollowupText(progressRefresh?.next_action || progressRefresh?.nextAction, "", 220);
  const nextAction = pickupNextAction || progressRefreshNextAction || groupStatusNextAction(status);
  lines.push(`下一步：${nextAction}`);
  lines.push("我不会猜测还没返回的子 Agent 结果；底层记录默认收在任务卡的技术详情里。");

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
    latest_task_title: "优化群聊主 Agent 工作链路",
    running_child_agents: ["web", "api"],
    child_agent_status_summary: {
      schema: "ccm-group-child-agent-status-summary-v1",
      title: "子 Agent 等待情况",
      status: "waiting",
      status_label: "等待中",
      completed_agents: ["web"],
      running_agents: ["api"],
      waiting_agents: ["qa"],
      attention_agents: ["docs"],
      summary_text: "已完成：web；处理中：api；等待中：qa；待补齐：docs",
      rows: [
        { agent: "web", status: "completed", status_label: "已完成", detail: "已提交结果说明" },
        { agent: "api", status: "running", status_label: "处理中", detail: "正在运行验证" },
        { agent: "qa", status: "pending", status_label: "等待中", detail: "等待派发" },
        { agent: "docs", status: "blocked", status_label: "待补齐", detail: "缺少验证证据" },
      ],
    },
    open_qa_count: 1,
    latest_progress_checkpoint: {
      label: "主 Agent 已派发子 Agent",
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
        agent_progress_summary: {
          rows: [
            { agent: "api", status: "running", current_focus: "正在验证接口" },
            { agent: "docs", status: "blocked", summary: "缺少验证证据" },
          ],
        },
      },
    }),
  });
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
      title: "长时间等待子 Agent 的任务",
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
          last_requeue: { at: "2020-01-01T00:20:00.000Z", reason: "子 Agent 工作项长时间无进展" },
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
  const checks = {
    groupStatusFollowupRecognized: isGroupProgressStatusRequest("现在进展怎么样了？"),
    groupStatusFollowupAvoidsManagementMutation: !isGroupProgressStatusRequest("把任务状态设置为 done"),
    groupStatusFollowupFriendly: summary.text.includes("最近群聊任务进展") && summary.text.includes("下一步"),
    groupStatusFollowupShowsChildAgentWaitingState: summary.text.includes("子 Agent 等待情况")
      && summary.text.includes("已完成：web")
      && summary.text.includes("处理中：api")
      && summary.text.includes("待补齐：docs")
      && summary.text.includes("正在等待/处理"),
    groupStatusDerivesChildAgentRows: derivedStatus.child_agent_status_summary?.completed_agents?.includes("web")
      && derivedStatus.child_agent_status_summary?.running_agents?.includes("api")
      && derivedStatus.child_agent_status_summary?.attention_agents?.includes("docs"),
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
