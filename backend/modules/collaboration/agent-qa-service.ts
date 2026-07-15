import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { updateProjectMemoryFromReceipt } from "../../projects/memory";
import { appendTraceEvent, ensureTraceId } from "../../system/reliability-ledger";
import { compactMemoryText } from "./memory";
import { appendTaskTimelineEvent, safeAddGroupLog } from "./logs";
import { sanitizeMainAgentUserText } from "./display";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

export const AGENT_QA_TIMEOUT_MS = 5 * 60 * 1000;

const AGENT_QA_FILE = path.join(CCM_DIR, "agent-qa.json");

type AgentQaServiceDeps = {
  getTaskById?: (taskId: string) => any;
  updateTask?: (taskId: string, updates: any) => any;
  writeSse?: (res: any, data: any) => void;
};

let deps: AgentQaServiceDeps = {};

export function configureAgentQaService(next: AgentQaServiceDeps) {
  deps = { ...deps, ...next };
}

export function loadAgentQaItems() {
  const data = readJsonWithBackup<any>(AGENT_QA_FILE, []);
  return Array.isArray(data) ? data : [];
}

export function saveAgentQaItems(items: any[]) {
  withFileLock(AGENT_QA_FILE, () => writeJsonAtomic(AGENT_QA_FILE, (items || []).slice(-800)));
}

export function upsertAgentQaItem(item: any) {
  return withFileLock(AGENT_QA_FILE, () => {
    const data = readJsonWithBackup<any>(AGENT_QA_FILE, []);
    const items = Array.isArray(data) ? data : [];
    const idx = items.findIndex((entry: any) => entry.id === item.id);
    const existing = idx >= 0 ? items[idx] : {};
    const now = new Date().toISOString();
    const next = {
      created_at: existing.created_at || item.created_at || now,
      retry_count: Number(existing.retry_count || item.retry_count || 0),
      manual_takeover: !!(existing.manual_takeover || item.manual_takeover),
      ...existing,
      ...item,
      updated_at: now,
    };
    if (idx >= 0) items[idx] = next;
    else items.push(next);
    writeJsonAtomic(AGENT_QA_FILE, items.slice(-800));
    return next;
  });
}

export function markExpiredAgentQaItems(groupId = "") {
  const nowMs = Date.now();
  const items = loadAgentQaItems();
  let changed = false;
  const expired: any[] = [];
  for (const item of items) {
    if (groupId && item.group_id !== groupId) continue;
    if (!["waiting", "asking", "queued"].includes(String(item.status || ""))) continue;
    const timeoutAt = item.timeout_at ? Date.parse(item.timeout_at) : 0;
    if (!timeoutAt || timeoutAt > nowMs) continue;
    item.status = "timeout";
    item.timed_out_at = new Date().toISOString();
    item.updated_at = item.timed_out_at;
    item.audit = [...(Array.isArray(item.audit) ? item.audit : []), { at: item.timed_out_at, type: "timeout", detail: "目标 Agent 未在预期时间内回答" }].slice(-30);
    appendAgentQaTrace(item.task_id || "", "agent.qa.timeout", item, "目标 Agent 未在截止时间前回答，等待主 Agent 重试、换人或人工接管", "warn", { deadline_at: item.deadline_at || item.timeout_at || "" });
    if (item.task_id) appendTaskTimelineEvent(item.task_id, { type: "agent_qa_timeout", title: `${item.to_agent || "目标 Agent"} 回答超时`, detail: `问题 ${item.id} 已触发超时熔断`, status: "warn", phase: "waiting_dependency", agent: item.from_agent || "", data: { qa_id: item.id, deadline_at: item.deadline_at || item.timeout_at || "" } });
    expired.push(item);
    changed = true;
  }
  if (changed) saveAgentQaItems(items);
  return expired;
}

export function getAgentQaItemsForGroup(groupId: string, limit = 80) {
  markExpiredAgentQaItems(groupId || "");
  return loadAgentQaItems()
    .filter((item: any) => !groupId || item.group_id === groupId)
    .slice(-limit);
}

export function setAgentQaManualTakeover(id: string, reason = "") {
  const current = loadAgentQaItems().find((item: any) => item.id === id);
  if (!current) return null;
  return upsertAgentQaItem({
    ...current,
    status: "manual",
    manual_takeover: true,
    manual_reason: compactMemoryText(reason || "用户接管该 Agent 问答", 500),
    manual_at: new Date().toISOString(),
    audit: [...(Array.isArray(current.audit) ? current.audit : []), { at: new Date().toISOString(), type: "manual_takeover", detail: reason || "用户接管" }].slice(-30),
  });
}

const AGENT_QA_USER_PREVIEW_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|native_session|task_agent_session|WorkerContextPacket|raw\s+receipt|raw\s+payload|raw_report|execution_id|permission_contract|routing|acceptance|qa_id|原始回执/i;

function sanitizeAgentQaPreviewText(value: any, fallback = "", max = 220) {
  const text = compactMemoryText(value || "", max);
  const safeFallback = sanitizeMainAgentUserText(fallback, fallback || "协作问答信息已整理，技术细节已放入技术详情。", max);
  if (!text) return safeFallback;
  if (AGENT_QA_USER_PREVIEW_INTERNAL_PATTERN.test(text)) return safeFallback;
  return sanitizeMainAgentUserText(text, fallback || "Agent 问答信息已整理，技术细节已放入技术详情。", max);
}

export function buildAgentQaUserPreview(qa: any = {}, kind = "") {
  const from = sanitizeAgentQaPreviewText(qa.from_agent || "执行成员", "执行成员", 80);
  const to = sanitizeAgentQaPreviewText(qa.to_agent || qa.target || "目标执行成员", "目标执行成员", 80);
  const status = String(kind === "question" ? "waiting" : qa.status || (qa.answer ? "answered" : "waiting")).toLowerCase();
  const accepted = qa.acceptance?.accepted === true || status === "resumed" || !!qa.resumed_at;
  const executing = ["asking", "executing", "merging"].includes(status);
  const waiting = ["waiting", "queued"].includes(status);
  const failed = ["failed", "timeout", "rejected"].includes(status);
  const needsUser = ["needs_user", "manual"].includes(status);
  const question = sanitizeAgentQaPreviewText(qa.question || "", "问题原文已收进技术详情。", 180);
  const answer = qa.answer ? sanitizeAgentQaPreviewText(qa.answer, "目标 Agent 已返回回答，详细内容已收进技术详情。", 220) : "";
  const isImplementation = qa.coordination_kind === "implementation" || qa.permission_contract?.mode === "formal_work_item_write";
  const typeLabel = isImplementation ? "协作工作项" : qa.type === "request_review" ? "评审请求" : "工作询问";
  const label = accepted
    ? "已采纳并继续"
    : executing
      ? status === "merging" ? "正在安全合并" : "正在并行处理"
    : waiting
      ? "等待回答"
      : needsUser
        ? "等待确认"
        : failed
          ? "需要处理"
          : answer
            ? "已回答"
            : "已记录";
  const summary = accepted
    ? isImplementation
      ? `${to} 已完成协作工作项并通过主 Agent 验收，${from} 正从原任务继续。`
      : `${to} 的回答已被主 Agent 采纳，${from} 正带着结论继续执行。`
    : executing
      ? isImplementation
        ? status === "merging"
          ? `${to} 已完成实现和验证，主 Agent 正在安全合并代码。`
          : `${to} 已在独立会话和工作区中并行处理 ${from} 的工作依赖。`
        : `${to} 正在处理 ${from} 的工作询问。`
    : waiting
      ? isImplementation
        ? `主 Agent 已安排 ${to} 处理 ${from} 的工作依赖，验收通过后会自动继续原任务。`
        : `${from} 正在向 ${to} 确认依赖问题，回答到达后会自动继续。`
      : needsUser
        ? `${from} 和 ${to} 的协作问题需要人工确认，主 Agent 已暂停相关步骤。`
        : failed
          ? `${from} 和 ${to} 的协作问答暂时没有可用结论，主 Agent 会重试、换人或等待接管。`
          : answer
            ? `${to} 已回答 ${from} 的问题，主 Agent 正在核对证据后决定是否采用。`
            : `${from} 与 ${to} 的协作问题已记录。`;
  const nextAction = accepted
    ? "继续原任务执行，后续由我汇总验收。"
    : executing
      ? status === "merging"
        ? "等待代码安全合并；完成后自动唤醒原 Agent。"
        : "目标 Agent 正在并行实现；完成后由主 Agent 验收。"
    : waiting
      ? isImplementation
        ? "等待正式工作项完成并通过验收；通过后自动唤醒原 Agent。"
        : "等待目标 Agent 回答；回答到达后会自动唤醒原 Agent。"
      : needsUser
        ? "需要你或我人工确认后再继续。"
        : failed
          ? "我会根据缺口重试、换人或提示人工接管。"
          : answer
            ? "我正在检查回答是否有足够证据。"
            : "等待我判断下一步。";
  const badges = [
    typeLabel,
    qa.blocking !== false ? "影响续跑" : "",
    qa.retry_count ? `已重试 ${qa.retry_count} 次` : "",
    qa.injected_at ? "已注入上下文" : "",
    qa.resumed_at ? "已续跑" : "",
    qa.permission_contract?.mode === "advisory_read_only" ? "只读问答" : "",
    isImplementation ? "正式可写工作项" : "",
    qa.work_item_task_id ? "已建立任务依赖" : "",
    Array.isArray(qa.answer_evidence) && qa.answer_evidence.length ? `${qa.answer_evidence.length} 条证据已收起` : "",
  ].filter(Boolean).slice(0, 6);
  return {
    schema: "ccm-agent-qa-user-preview-v1",
    from,
    to,
    label,
    status,
    summary: sanitizeAgentQaPreviewText(summary, "Agent 协作问答进展已更新。", 260),
    question,
    answer,
    next_action: sanitizeAgentQaPreviewText(nextAction, "等待下一步处理。", 260),
    badges,
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

export function buildAgentQaMessage(kind: "question" | "progress" | "answer" | "resume", qa: any, content = "") {
  const preview = buildAgentQaUserPreview(qa, kind);
  const qaContent = preview.summary || sanitizeAgentQaPreviewText(content || qa.answer || qa.question || "", "Agent 问答进展已更新。", 260);
  return {
    id: "m" + Date.now().toString(36) + "qa" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: kind === "answer" ? qa.to_agent : qa.from_agent,
    type: "agent_qa",
    content: qaContent,
    display_content: qaContent,
    timestamp: new Date().toISOString(),
    task_id: qa.task_id || undefined,
    qa: {
      ...qa,
      kind,
      status: kind === "question" ? "waiting" : qa.status || (kind === "progress" ? "executing" : "answered"),
      user_preview: preview,
    },
  };
}

export function emitAgentQaEvent(streamRes: any, kind: "question" | "progress" | "answer" | "resume", qa: any, content = "") {
  if (!deps.writeSse) return;
  const preview = buildAgentQaUserPreview(qa, kind);
  deps.writeSse(streamRes, {
    type: "agent_qa",
    kind,
    qa: {
      ...qa,
      kind,
      content: preview.summary || content || qa.answer || qa.question || "",
      user_preview: preview,
    },
  });
}

export function setAgentQaArbitration(id: string, decision: "accept" | "reject", reason = "") {
  const current = loadAgentQaItems().find((item: any) => item.id === id);
  if (!current) return null;
  const at = new Date().toISOString();
  const accepted = decision === "accept";
  const next = upsertAgentQaItem({
    ...current,
    status: accepted ? "answered" : "rejected",
    acceptance: {
      ...(current.acceptance || {}),
      status: accepted ? "accepted" : "rejected",
      accepted,
      reason: compactMemoryText(reason || (accepted ? "主 Agent 人工采纳回答" : "主 Agent 人工拒绝回答"), 800),
      arbitrated_by: "group_coordinator_manual",
      arbitrated_at: at,
    },
    audit: [...(Array.isArray(current.audit) ? current.audit : []), { at, type: accepted ? "manual_accept" : "manual_reject", detail: reason || "主 Agent 人工仲裁" }].slice(-30),
  });
  appendAgentQaTrace(next.task_id || "", accepted ? "agent.qa.accepted" : "agent.qa.rejected", next, next.acceptance.reason, accepted ? "ok" : "warn", { acceptance: next.acceptance });
  if (accepted) writeAcceptedAgentQaToProjectMemory(next);
  if (next.task_id) appendTaskTimelineEvent(next.task_id, { type: accepted ? "agent_qa_accepted" : "agent_qa_rejected", title: `主 Agent ${accepted ? "采纳" : "拒绝"}问答`, detail: next.acceptance.reason, status: accepted ? "ok" : "warn", phase: accepted ? "executing" : "waiting_dependency", agent: next.from_agent || "", data: { qa_id: next.id, acceptance: next.acceptance } });
  return next;
}

export function appendAgentQaTrace(taskId: string, type: string, qa: any, message: string, status = "info", data: any = {}) {
  if (!taskId) return "";
  const task = deps.getTaskById?.(taskId);
  if (!task) return "";
  const traceId = ensureTraceId(task.trace_id || "", `task_${taskId}`);
  if (traceId !== task.trace_id) deps.updateTask?.(taskId, { trace_id: traceId });
  appendTraceEvent(traceId, {
    id: `${qa?.id || qa?.question_id || "qa"}:${type}:${Date.now()}`,
    type,
    status,
    task_id: taskId,
    group_id: qa?.group_id || task.group_id || "",
    agent: qa?.from_agent || "",
    message: compactMemoryText(message, 1000),
    data: { qa_id: qa?.id || qa?.question_id || "", from: qa?.from_agent || "", to: qa?.to_agent || "", ...data },
  });
  return traceId;
}

export function writeAcceptedAgentQaToProjectMemory(qa: any) {
  if (!qa?.acceptance?.accepted || Number(qa.acceptance.score || 0) < 60 || !qa.from_agent) return null;
  try {
    return updateProjectMemoryFromReceipt({
      project: qa.from_agent,
      workDir: qa.continuation?.source_work_dir || "",
      groupId: qa.group_id || "",
      taskId: qa.task_id || "",
      receipt: {
        status: "done",
        summary: `Agent 协作结论：${compactMemoryText(qa.question, 260)} → ${compactMemoryText(qa.answer, 700)}`,
        filesChanged: [],
        verification: [],
        newDecisions: [{
          decision: compactMemoryText(qa.answer, 1000),
          reason: `由 ${qa.to_agent} 回答 ${qa.from_agent}，主 Agent 证据门禁评分 ${qa.acceptance.score}${qa.answer_evidence?.length ? `；证据：${qa.answer_evidence.slice(0, 6).join("、")}` : ""}`,
          source: "agent_collaboration_8",
        }],
      },
    });
  } catch (error: any) {
    safeAddGroupLog(qa.group_id || "", "warning", "agent_qa_memory", `Agent 问答写入项目记忆失败：${error?.message || error}`, { qa_id: qa.id });
    return null;
  }
}
