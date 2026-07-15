import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadTasks } from "../core/db";
import { addTaskLog, appendTaskTimelineEvent } from "../modules/collaboration/logs";
import { InternalMcpTaskContext } from "./internal-mcp-runtime";

const ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "task-runtime");

export type InternalMcpTaskJournalEntry = {
  schema: "ccm-internal-mcp-task-event-v1";
  id: string;
  at: string;
  task_id: string;
  group_id: string;
  project: string;
  role: string;
  actor: string;
  kind: "todo" | "progress" | "delivery" | "decision" | "workspace" | "test";
  payload: Record<string, any>;
};

function safeSegment(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}

export function internalMcpTaskJournalFile(taskId: string) {
  return path.join(ROOT, `${safeSegment(taskId)}.jsonl`);
}

function cleanText(value: any, max = 1200) {
  return String(value || "")
    .replace(/(api[_-]?key|access[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
    .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
    .trim()
    .slice(0, max);
}

function cleanList(value: any, max = 50, itemMax = 500) {
  return [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(item => cleanText(item, itemMax)).filter(Boolean))].slice(0, max);
}

export function getBoundInternalMcpTask(context: InternalMcpTaskContext) {
  const task = loadTasks().find((item: any) => String(item?.id || "") === context.taskId);
  if (!task) throw new Error("绑定任务不存在或已被清理");
  if (context.groupId && String(task.group_id || "") && String(task.group_id) !== context.groupId) throw new Error("任务不属于当前群聊绑定");
  return task;
}

export function readInternalMcpTaskJournal(taskId: string, limit = 120) {
  const file = internalMcpTaskJournalFile(taskId);
  if (!fs.existsSync(file)) return [] as InternalMcpTaskJournalEntry[];
  return fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line) as InternalMcpTaskJournalEntry]; } catch { return []; }
  }).slice(-Math.max(1, Math.min(500, Number(limit || 120))));
}

export function appendInternalMcpTaskJournal(
  context: InternalMcpTaskContext,
  kind: InternalMcpTaskJournalEntry["kind"],
  payload: Record<string, any>,
  timeline: { type: string; title: string; detail: string; status?: string; phase?: string },
) {
  getBoundInternalMcpTask(context);
  const entry: InternalMcpTaskJournalEntry = {
    schema: "ccm-internal-mcp-task-event-v1",
    id: `imcp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
    at: new Date().toISOString(),
    task_id: context.taskId,
    group_id: context.groupId,
    project: context.project,
    role: context.role,
    actor: context.taskAgentSessionId || context.project,
    kind,
    payload,
  };
  fs.mkdirSync(ROOT, { recursive: true });
  fs.appendFileSync(internalMcpTaskJournalFile(context.taskId), `${JSON.stringify(entry)}\n`, "utf-8");
  appendTaskTimelineEvent(context.taskId, {
    id: `timeline:${entry.id}`,
    type: timeline.type,
    title: timeline.title,
    detail: cleanText(timeline.detail, 800),
    status: timeline.status || "info",
    phase: timeline.phase || "execution",
    agent: context.project,
    data: { internal_mcp_event_id: entry.id, kind, role: context.role, project: context.project },
  });
  addTaskLog(context.taskId, timeline.status === "failed" ? "error" : timeline.status === "warning" ? "warning" : "info", `${timeline.title}：${cleanText(timeline.detail, 300)}`);
  return entry;
}

export function publicInternalMcpTaskContext(context: InternalMcpTaskContext) {
  const task = getBoundInternalMcpTask(context);
  const journal = readInternalMcpTaskJournal(context.taskId);
  const latestTodo = [...journal].reverse().find(item => item.kind === "todo" && item.project === context.project)?.payload || null;
  const progress = journal.filter(item => item.kind === "progress").slice(-20);
  const decisions = journal.filter(item => item.kind === "decision" && item.payload.status !== "resolved").slice(-20);
  return {
    schema: "ccm-internal-mcp-task-context-view-v1",
    task: {
      id: task.id,
      title: cleanText(task.title || task.name || "任务", 240),
      goal: cleanText(task.business_goal || task.description || task.goal || "", 1800),
      status: String(task.status || "pending"),
      phase: String(task.current_phase || task.lifecycle?.phase || ""),
      acceptance_criteria: cleanList(task.acceptance_criteria || task.acceptanceCriteria, 40, 800),
      constraints: cleanList(task.constraints, 40, 800),
      target_project: String(task.target_project || ""),
      parent_task_id: String(task.parent_task_id || ""),
      work_items: Array.isArray(task.work_items) ? task.work_items.slice(0, 40).map((item: any) => ({
        id: String(item.id || ""),
        title: cleanText(item.title || item.label || "工作项", 240),
        status: String(item.status || ""),
        agent: String(item.agent || item.project || ""),
      })) : [],
    },
    binding: { project: context.project, role: context.role, group_id: context.groupId, work_dir: context.workDir },
    todo: latestTodo,
    recent_progress: progress,
    pending_user_decisions: decisions,
  };
}

export const internalMcpTaskPayload = {
  cleanText,
  cleanList,
};
