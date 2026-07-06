import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { updateProjectMemoryFromReceipt } from "../../projects/memory";
import { appendTraceEvent, ensureTraceId } from "../../system/reliability-ledger";
import { compactMemoryText } from "./memory";
import { appendTaskTimelineEvent, safeAddGroupLog } from "./logs";

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
  if (!fs.existsSync(AGENT_QA_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(AGENT_QA_FILE, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveAgentQaItems(items: any[]) {
  fs.writeFileSync(AGENT_QA_FILE, JSON.stringify((items || []).slice(-800), null, 2));
}

export function upsertAgentQaItem(item: any) {
  const items = loadAgentQaItems();
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
  saveAgentQaItems(items);
  return next;
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

export function buildAgentQaMessage(kind: "question" | "answer" | "resume", qa: any, content = "") {
  const qaContent = content || qa.answer || qa.question || "";
  return {
    id: "m" + Date.now().toString(36) + "qa" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: kind === "answer" ? qa.to_agent : qa.from_agent,
    type: "agent_qa",
    content: qaContent,
    timestamp: new Date().toISOString(),
    task_id: qa.task_id || undefined,
    qa: {
      ...qa,
      kind,
      status: kind === "question" ? "waiting" : qa.status || "answered",
    },
  };
}

export function emitAgentQaEvent(streamRes: any, kind: "question" | "answer" | "resume", qa: any, content = "") {
  if (!deps.writeSse) return;
  deps.writeSse(streamRes, {
    type: "agent_qa",
    kind,
    qa: {
      ...qa,
      kind,
      content: content || qa.answer || qa.question || "",
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
