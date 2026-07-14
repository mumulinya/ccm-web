import * as crypto from "crypto";
import * as path from "path";
import { loadTasks } from "../../core/db";
import { listExecutions } from "../../agents/execution-kernel";
import { listGlobalAgentRuns } from "../../agents/global/loop";
import { listGlobalMissionSupervisors } from "../../agents/global/mission-supervisor";
import { getTaskAgentSessionContinuity, listTaskAgentSessions } from "../../tasks/agent-sessions";
import { getTrace } from "../../system/reliability-ledger";
import { listTaskReplayJournalEvents, runTaskReplayJournalSelfTest } from "../../system/task-replay-journal";
import {
  listTestAgentArtifactCatalogForTasks,
  resolveTestAgentArtifactForTask,
  type ResolvedTestAgentArtifact,
} from "../../test-agent/artifact-retention";
import { getTaskLogs, getTaskTimeline } from "./logs";
import { getGroupMessages } from "./storage";
import { listTestAgentRunnerRecords } from "./test-agent-runner";

export type TaskReplayStage = "intake" | "planning" | "dispatch" | "execution" | "change" | "test" | "rework" | "review" | "completion" | "system";
export type TaskReplayStatus = "info" | "running" | "passed" | "warning" | "failed" | "blocked" | "cancelled";

export interface TaskReplayEvent {
  id: string;
  at: string;
  stage: TaskReplayStage;
  category: string;
  status: TaskReplayStatus;
  title: string;
  summary: string;
  actor: { type: "user" | "global_agent" | "group_agent" | "project_agent" | "test_agent" | "system"; label: string };
  task_id: string;
  parent_task_id: string;
  trace_id: string;
  project: string;
  source: string;
  evidence_ids: string[];
  technical?: Record<string, any>;
}

const STAGE_ORDER: TaskReplayStage[] = ["intake", "planning", "dispatch", "execution", "change", "test", "rework", "review", "completion", "system"];
const TERMINAL = new Set(["done", "completed", "failed", "cancelled", "reverted"]);

function stableId(prefix: string, value: any) {
  return `${prefix}_${crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, 22)}`;
}

function iso(value: any, fallback = "") {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function safeText(value: any, max = 1200) {
  let text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  text = text
    .replace(/CCM_AGENT_RECEIPT[\s\S]*?(?=\n\S|$)/gi, "[内部回执已收起]")
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
    .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
    .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
    .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]")
    .replace(/\r\n/g, "\n")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function publicFile(value: any) {
  const raw = String(value?.path || value?.file || value || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? path.basename(raw) : raw.replace(/\\/g, "/").replace(/^\.\//, "").slice(0, 260);
}

function safeTechnical(value: any, depth = 0): any {
  if (depth > 5 || value == null) return value == null ? value : "[详情已收起]";
  if (Array.isArray(value)) return value.slice(0, 60).map(item => safeTechnical(item, depth + 1));
  if (typeof value === "string") return safeText(value, 800);
  if (typeof value !== "object") return value;
  const result: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/nativeSession|native_session|previousNative|mcpConfigPath|mcp_config_path|snapshotPath|snapshot_path|workDir|realWorkDir|stdoutPath|stderrPath|handoffPath|file_path/i.test(key)) continue;
    if (/(api.?key|token|password|authorization|secret)/i.test(key)) { result[key] = "[已隐藏]"; continue; }
    result[key] = safeTechnical(item, depth + 1);
  }
  return result;
}

function stringList(values: any, max = 100) {
  return [...new Set((Array.isArray(values) ? values : values ? [values] : []).map(publicFile).filter(Boolean))].slice(0, max);
}

function safeDiffText(value: any, max = 220_000) {
  const text = String(value || "")
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
    .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
    .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
    .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]")
    .replace(/\r\n/g, "\n");
  return text.length > max ? `${text.slice(0, max)}\n[代码变更过长，已截断]` : text;
}

function replayChangeRows(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.files)) return value.files;
  return [];
}

function normalizeReplayChange(item: any, fallbackProject = "") {
  const filePath = publicFile(item);
  if (!filePath) return null;
  const source = item && typeof item === "object" ? item : {};
  const sourceDiff = source.diff && typeof source.diff === "object" ? source.diff : {};
  const rawDiff = safeDiffText(sourceDiff.diff || sourceDiff.raw || source.unified_diff || source.patch || "");
  const additions = Math.max(0, Number(source.additions || sourceDiff.additions || 0) || 0);
  const deletions = Math.max(0, Number(source.deletions || sourceDiff.deletions || 0) || 0);
  const project = safeText(source.project || source.target_project || source.projectName || source.agent || fallbackProject, 100);
  const statusText = safeText(source.statusText || source.status_label || source.status || "变更", 40);
  const unavailableReason = safeText(
    sourceDiff.reason || (rawDiff ? "" : "该任务当时只保存了文件与行数统计，无法还原逐行代码内容"),
    180,
  );
  return {
    path: filePath,
    project,
    agent: safeText(source.agent || project, 100),
    statusText,
    statusKind: safeText(source.statusKind || source.status_kind || "changed", 40),
    statusColor: safeText(source.statusColor || source.status_color || "#64748b", 20),
    additions,
    deletions,
    diff: {
      available: !!rawDiff,
      diff: rawDiff,
      raw: rawDiff,
      additions,
      deletions,
      truncated: sourceDiff.truncated === true || rawDiff.endsWith("[代码变更过长，已截断]"),
      reason: unavailableReason,
      historical: true,
    },
  };
}

function mergeReplayChange(current: any, incoming: any) {
  const currentHasDiff = current?.diff?.available === true;
  const incomingHasDiff = incoming?.diff?.available === true;
  const preferred = incomingHasDiff && !currentHasDiff ? incoming : current;
  return {
    ...current,
    ...incoming,
    project: current.project || incoming.project,
    agent: current.agent || incoming.agent,
    additions: Math.max(Number(current.additions || 0), Number(incoming.additions || 0)),
    deletions: Math.max(Number(current.deletions || 0), Number(incoming.deletions || 0)),
    diff: preferred.diff,
  };
}

function replayTaskChanges(task: any) {
  const fallbackProject = String(task?.target_project || "");
  const summary = task?.delivery_summary || {};
  const rows: Array<{ item: any; project: string }> = [];
  const append = (value: any, project = fallbackProject) => {
    for (const item of replayChangeRows(value)) rows.push({ item, project });
  };
  append(summary.actual_file_changes);
  append(summary.files_changed);
  append(summary.file_changes);
  append(task?.file_changes);
  for (const execution of listExecutions({ taskId: task?.id })) {
    append((execution as any)?.fileChanges, String((execution as any)?.project || (execution as any)?.agent || fallbackProject));
  }
  if (task?.group_id) {
    const sessionId = String(task.group_session_id || task.groupSessionId || "default");
    for (const message of getGroupMessages(task.group_id, sessionId)) {
      if (String(message?.task_id || message?.task?.id || "") !== String(task.id || "")) continue;
      append(message?.fileChanges || message?.file_changes, String(message?.project || message?.agent || fallbackProject));
    }
  }

  const byFile = new Map<string, any>();
  for (const row of rows) {
    const change = normalizeReplayChange(row.item, row.project);
    if (!change) continue;
    const key = `${String(change.project || fallbackProject).toLowerCase()}|${change.path.toLowerCase()}`;
    byFile.set(key, byFile.has(key) ? mergeReplayChange(byFile.get(key), change) : change);
  }
  return [...byFile.values()].slice(0, 200);
}

function normalizeStatus(value: any): TaskReplayStatus {
  const text = String(value || "").toLowerCase();
  if (/cancel|revert/.test(text)) return "cancelled";
  if (/fail|error|reject|invalid/.test(text)) return "failed";
  if (/block|waiting_user|needs_user/.test(text)) return "blocked";
  if (/warn|partial|attention|needs_review/.test(text)) return "warning";
  if (/running|progress|reviewing|executing|queued|monitoring|supervising/.test(text)) return "running";
  if (/pass|success|succeed|complete|done|ok|accept/.test(text)) return "passed";
  return "info";
}

function inferStage(value: any): TaskReplayStage {
  const text = String(value || "").toLowerCase();
  if (/rework|retry|repair|fix|返工|修复/.test(text)) return "rework";
  if (/test.?agent|playwright|browser|screenshot|verify|verification|测试|验证/.test(text)) return "test";
  if (/review|accept|spot.?check|验收|抽查/.test(text)) return "review";
  if (/complete|delivery|final|summary|report|done|交付|完成|总结/.test(text)) return "completion";
  if (/file|change|diff|commit|merge|代码|改动/.test(text)) return "change";
  if (/dispatch|assign|handoff|work.?item|派发|分配|接单/.test(text)) return "dispatch";
  if (/execute|runtime|session|agent\.run|执行/.test(text)) return "execution";
  if (/plan|todo|decompos|计划|拆解/.test(text)) return "planning";
  if (/intake|request|created|user|需求|创建/.test(text)) return "intake";
  return "system";
}

function actor(type: TaskReplayEvent["actor"]["type"], label: string) {
  const defaults = { user: "用户", global_agent: "全局主 Agent", group_agent: "群聊主 Agent", project_agent: "项目子 Agent", test_agent: "TestAgent", system: "系统" };
  return { type, label: safeText(label || defaults[type], 80) || defaults[type] };
}

function event(input: Partial<TaskReplayEvent> & Pick<TaskReplayEvent, "title">): TaskReplayEvent {
  const source = String(input.source || "task");
  const at = iso(input.at, new Date(0).toISOString());
  return {
    id: String(input.id || stableId("tre", { source, at, title: input.title, task: input.task_id })),
    at,
    stage: input.stage || inferStage(`${source} ${input.category || ""} ${input.title}`),
    category: String(input.category || "event"),
    status: input.status || "info",
    title: safeText(input.title, 180) || "任务记录",
    summary: safeText(input.summary, 1200),
    actor: input.actor || actor("system", "系统"),
    task_id: String(input.task_id || ""),
    parent_task_id: String(input.parent_task_id || ""),
    trace_id: String(input.trace_id || ""),
    project: safeText(input.project, 100),
    source,
    evidence_ids: [...new Set(input.evidence_ids || [])],
    ...(input.technical ? { technical: safeTechnical(input.technical) } : {}),
  };
}

function rootTaskFor(task: any, byId: Map<string, any>) {
  let current = task;
  const seen = new Set<string>();
  while (current?.parent_task_id && byId.has(current.parent_task_id) && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.parent_task_id);
  }
  return current || task;
}

function taskFamily(taskId: string) {
  const tasks = loadTasks();
  const byId = new Map(tasks.map((task: any) => [String(task.id), task]));
  const selected = byId.get(taskId);
  if (!selected) return null;
  const root = rootTaskFor(selected, byId);
  const missionIds = new Set([root.global_mission_id, root.mission_id, root.id].map(String).filter(Boolean));
  const ids = new Set<string>([String(root.id)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of tasks) {
      const id = String(task.id || "");
      const related = ids.has(String(task.parent_task_id || ""))
        || (Array.isArray(task.child_task_ids) && task.child_task_ids.some((child: any) => ids.has(String(child))))
        || (!!task.global_mission_id && missionIds.has(String(task.global_mission_id)));
      if (id && related && !ids.has(id)) { ids.add(id); changed = true; }
    }
  }
  return { root, selected, tasks: tasks.filter((task: any) => ids.has(String(task.id))), ids };
}

function taskLabel(task: any) {
  return safeText(task?.title || task?.business_goal || task?.description || "未命名任务", 180);
}

function messageActor(message: any) {
  if (message?.role === "user") return actor("user", "用户");
  const name = String(message?.agent || message?.project || message?.target || "");
  if (/test.?agent/i.test(name)) return actor("test_agent", "TestAgent");
  if (name && !/coordinator|主.?agent|global/i.test(name)) return actor("project_agent", name);
  return actor("group_agent", "群聊主 Agent");
}

function buildTaskEvents(tasks: any[]) {
  const events: TaskReplayEvent[] = [];
  for (const task of tasks) {
    const taskId = String(task.id || "");
    events.push(event({ id: `task:${taskId}:created`, at: task.created_at, stage: "intake", category: "task", status: "info", title: task.parent_task_id ? "群聊主 Agent 创建项目子任务" : "任务已创建", summary: taskLabel(task), actor: actor(task.parent_task_id ? "group_agent" : "user", task.parent_task_id ? "群聊主 Agent" : "用户"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: task.target_project, source: "task" }));
    for (const item of getTaskTimeline(task)) {
      events.push(event({ id: `timeline:${taskId}:${item.id || stableId("row", item)}`, at: item.at, category: String(item.type || "timeline"), status: normalizeStatus(item.status), title: item.title || item.type || "任务进展", summary: item.detail || item.message, actor: item.agent ? actor(/test.?agent/i.test(item.agent) ? "test_agent" : "project_agent", item.agent) : actor("group_agent", "群聊主 Agent"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: item.agent || task.target_project, source: "timeline", technical: item.data && typeof item.data === "object" ? { phase: item.phase || "", files: stringList(item.data.files || item.data.files_changed, 30) } : undefined }));
    }
    for (const [index, item] of getTaskLogs(taskId, 100).entries()) {
      events.push(event({ id: `task-log:${taskId}:${index}:${item.timestamp}`, at: item.timestamp, category: "task_log", status: normalizeStatus(item.level), title: item.level === "error" ? "任务运行异常" : item.level === "warning" ? "任务运行提示" : "任务运行记录", summary: item.message, actor: actor("system", "任务运行器"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, source: "task_log" }));
    }
    if (task.updated_at && TERMINAL.has(String(task.status || "").toLowerCase())) {
      const summary = task.final_report || task.delivery_summary?.user_report || task.result || task.status_detail || taskLabel(task);
      events.push(event({ id: `task:${taskId}:terminal`, at: task.completed_at || task.updated_at, stage: "completion", category: "task_status", status: normalizeStatus(task.status), title: normalizeStatus(task.status) === "passed" ? "任务已完成并形成总结" : `任务${task.status === "cancelled" ? "已取消" : "已结束"}`, summary, actor: actor("group_agent", "群聊主 Agent"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, source: "task" }));
    }
  }
  return events;
}

function buildMessageEvents(tasks: any[]) {
  const events: TaskReplayEvent[] = [];
  for (const task of tasks) {
    if (!task.group_id) continue;
    const sessionId = String(task.group_session_id || task.groupSessionId || "default");
    const messages = getGroupMessages(task.group_id, sessionId).filter((message: any) => String(message?.task_id || message?.task?.id || "") === String(task.id));
    for (const [index, message] of messages.entries()) {
      const content = safeText(message.content || message.summary, 1000);
      if (!content || /CCM_AGENT_RECEIPT/i.test(String(message.content || ""))) continue;
      const who = messageActor(message);
      events.push(event({ id: `message:${message.id || stableId("msg", { index, content })}`, at: message.timestamp || message.created_at, stage: message.role === "user" ? "intake" : undefined, category: "message", status: normalizeStatus(message.status), title: who.type === "user" ? "用户补充任务要求" : who.type === "project_agent" ? `${who.label} 返回工作结果` : "群聊主 Agent 更新进展", summary: content, actor: who, task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: message.trace_id || task.trace_id, project: message.project || message.agent, source: "group_message" }));
    }
  }
  return events;
}

function buildExecutionEvents(tasks: any[]) {
  const events: TaskReplayEvent[] = [];
  for (const task of tasks) {
    for (const executionRecord of listExecutions({ taskId: task.id })) {
      const execution: any = executionRecord;
      const rows = Array.isArray(execution.events) ? execution.events : [];
      for (const [index, row] of rows.entries()) {
        events.push(event({ id: `execution:${execution.id}:${row.id || index}`, at: row.at || row.timestamp, category: row.name || row.type || "execution", status: normalizeStatus(row.status || row.state), title: safeText(row.message || row.name || `项目子 Agent ${execution.state}`, 180), summary: row.message || row.detail, actor: actor("project_agent", execution.project || execution.agent || "项目子 Agent"), task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: execution.project, source: "execution", technical: { execution_id: execution.id, runtime: execution.runtime || execution.packet?.agentType || "", state: row.state || execution.state || "", failure_class: row.failureClass || execution.failure?.class || "" } }));
      }
      if (!rows.length) events.push(event({ id: `execution:${execution.id}`, at: execution.updatedAt || execution.createdAt, stage: "execution", category: "execution", status: normalizeStatus(execution.state), title: `${execution.project || "项目子 Agent"} ${execution.state || "执行"}`, summary: execution.failure?.message || "", actor: actor("project_agent", execution.project || execution.agent || "项目子 Agent"), task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: execution.project, source: "execution", technical: { execution_id: execution.id, runtime: execution.runtime || execution.packet?.agentType || "" } }));
    }
    for (const session of listTaskAgentSessions({ taskId: task.id })) {
      events.push(event({ id: `session:${session.id}`, at: session.createdAt || session.openedAt || session.lastUsedAt, stage: "execution", category: "agent_session", status: normalizeStatus(session.status), title: `${session.project || "项目子 Agent"} 工作会话${session.status === "open" ? "已建立" : "已结束"}`, summary: session.lastError || `已执行 ${Number(session.turnCount || 0)} 轮`, actor: actor("project_agent", session.project || session.agentType || "项目子 Agent"), task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: session.project, source: "agent_session", technical: { session_id: session.id, executor: session.agentType || "", continuity: getTaskAgentSessionContinuity(session) } }));
    }
  }
  return events;
}

function buildTraceEvents(tasks: any[], extraTraceIds: string[]) {
  const taskById = new Map(tasks.map(task => [String(task.id), task]));
  const ids = new Set([...tasks.map(task => String(task.trace_id || "")), ...extraTraceIds].filter(Boolean));
  const events: TaskReplayEvent[] = [];
  for (const traceId of ids) {
    const trace = getTrace(traceId);
    for (const row of Array.isArray(trace?.events) ? trace.events : []) {
      const task = taskById.get(String(row.task_id || "")) || tasks[0];
      events.push(event({ id: `trace:${traceId}:${row.id || stableId("row", row)}`, at: row.at, category: row.type || "trace", status: normalizeStatus(row.status), title: safeText(row.message || row.type || "系统轨迹", 180), summary: row.message, actor: row.agent ? actor(/test.?agent/i.test(row.agent) ? "test_agent" : "project_agent", row.agent) : actor(/global/i.test(row.type) ? "global_agent" : "system", /global/i.test(row.type) ? "全局主 Agent" : "系统"), task_id: String(row.task_id || task?.id || ""), parent_task_id: String(task?.parent_task_id || ""), trace_id: traceId, project: row.agent, source: "trace", technical: { type: row.type || "", runtime: row.runtime || "" } }));
    }
  }
  return events;
}

function buildJournalEvents(tasks: any[]) {
  const taskById = new Map(tasks.map(task => [String(task.id), task]));
  return listTaskReplayJournalEvents(tasks.map(task => String(task.id))).map(row => {
    const source = row.event || {};
    const task = taskById.get(String(source.task_id || row.task_id || "")) || tasks[0];
    return event({ id: `journal:${row.task_id}:${source.id || stableId("row", source)}`, at: source.at || row.recorded_at, category: source.type || "journal", status: normalizeStatus(source.status), title: safeText(source.message || source.type || "任务轨迹", 180), summary: source.message, actor: source.agent ? actor(/test.?agent/i.test(source.agent) ? "test_agent" : "project_agent", source.agent) : actor(/global/i.test(source.type) ? "global_agent" : "system", /global/i.test(source.type) ? "全局主 Agent" : "系统"), task_id: String(source.task_id || row.task_id || task?.id || ""), parent_task_id: String(task?.parent_task_id || ""), trace_id: source.trace_id || task?.trace_id || "", project: source.agent, source: "journal", technical: { type: source.type || "", runtime: source.runtime || "" } });
  });
}

function relatedGlobalRecords(ids: Set<string>) {
  const runs = listGlobalAgentRuns({ limit: 100 }).filter(run => ids.has(String(run.mission_id || "")) || run.steps.some(step => ids.has(String(step?.observation?.task_id || step?.observation?.mission_id || ""))));
  const runIds = new Set(runs.map(run => run.id));
  const supervisors = listGlobalMissionSupervisors({ limit: 200 }).filter(record => ids.has(String(record.mission_id || "")) || runIds.has(record.global_run_id));
  return { runs, supervisors };
}

function buildGlobalEvents(records: ReturnType<typeof relatedGlobalRecords>, fallbackTask: any) {
  const events: TaskReplayEvent[] = [];
  for (const run of records.runs) {
    events.push(event({ id: `global:${run.id}:created`, at: run.created_at, stage: "intake", category: "global_agent", status: "info", title: "全局主 Agent 接收复杂任务", summary: run.original_user_message || run.user_message, actor: actor("global_agent", "全局主 Agent"), task_id: run.mission_id || fallbackTask.id, trace_id: run.trace_id, source: "global_agent", technical: { run_id: run.id } }));
    for (const step of run.steps || []) {
      const tool = step.tool?.name || "";
      events.push(event({ id: `global:${run.id}:step:${step.index}`, at: step.at, category: `global_${step.state || "step"}`, status: normalizeStatus(step.error ? "failed" : step.state), title: tool ? `全局主 Agent 执行 ${tool}` : `全局主 Agent ${step.state || "推进任务"}`, summary: step.error || step.message || (step.plan || []).join("；"), actor: actor("global_agent", "全局主 Agent"), task_id: run.mission_id || fallbackTask.id, trace_id: run.trace_id, source: "global_agent", technical: { run_id: run.id, step: step.index, tool, duration_ms: Number(step.duration_ms || 0) } }));
    }
    if (run.final_reply || run.final_report) events.push(event({ id: `global:${run.id}:final`, at: run.completed_at || run.updated_at, stage: "completion", category: "global_summary", status: normalizeStatus(run.status), title: "全局主 Agent 汇总任务结果", summary: run.final_reply || run.final_report?.summary || run.final_report, actor: actor("global_agent", "全局主 Agent"), task_id: run.mission_id || fallbackTask.id, trace_id: run.trace_id, source: "global_agent", technical: { run_id: run.id } }));
  }
  for (const record of records.supervisors) {
    for (const [index, actionRow] of (record.actions || []).entries()) events.push(event({ id: `supervisor:${record.id}:action:${index}`, at: actionRow.at || record.updated_at, category: actionRow.type || actionRow.action || "supervision", status: normalizeStatus(actionRow.status || "running"), title: actionRow.title || actionRow.message || "全局主 Agent 跟踪群聊任务", summary: actionRow.detail || actionRow.reason || actionRow.message, actor: actor("global_agent", "全局主 Agent"), task_id: record.mission_id, trace_id: record.trace_id, source: "mission_supervisor", technical: { supervisor_id: record.id, cycle: actionRow.cycle || "" } }));
    for (const [index, incident] of (record.incidents || []).entries()) events.push(event({ id: `supervisor:${record.id}:incident:${index}`, at: incident.at || record.updated_at, category: incident.type || "incident", status: normalizeStatus(incident.status || incident.type || "warning"), title: incident.title || incident.message || "任务出现需要处理的问题", summary: incident.reason || incident.detail || incident.message, actor: actor("global_agent", "全局主 Agent"), task_id: incident.task_id || record.mission_id, trace_id: record.trace_id, source: "mission_supervisor", technical: { supervisor_id: record.id, occurrence_count: Number(incident.occurrence_count || 1), resolved_at: incident.resolved_at || "" } }));
  }
  return events;
}

function buildTestAgentEvents(taskIds: string[], artifactRuns: ReturnType<typeof listTestAgentArtifactCatalogForTasks>) {
  const events: TaskReplayEvent[] = [];
  const records = listTestAgentRunnerRecords({ taskIds, limit: 1000 });
  for (const record of records) {
    const result = record.result || {};
    const invocation = result.schema === "ccm-test-agent-invocation-result-v1" ? result : result.invocation || result;
    const report = invocation.report || {};
    const title = record.mode === "plan" ? "TestAgent 生成独立测试计划" : record.status === "completed" ? "TestAgent 完成独立验证" : "TestAgent 验证未通过";
    const summary = record.error || report.summary || invocation.error || (record.mode === "plan" ? "测试范围与验证步骤已生成" : `结论：${invocation.recommendation || invocation.outcome || record.status}`);
    events.push(event({ id: `test-agent-run:${record.id}`, at: record.finishedAt || record.startedAt || record.createdAt, stage: record.mode === "plan" ? "planning" : "test", category: record.mode === "plan" ? "test_plan" : "test_run", status: normalizeStatus(record.status === "completed" && invocation.canAccept !== false ? "passed" : record.status), title, summary, actor: actor("test_agent", "TestAgent"), task_id: record.taskId, source: "test_agent_runner", technical: { run_id: record.id, mode: record.mode, duration_ms: Math.max(0, Date.parse(record.finishedAt || record.heartbeatAt) - Date.parse(record.startedAt || record.createdAt)), outcome: invocation.outcome || "", recommendation: invocation.recommendation || "", can_accept: invocation.canAccept === true, source_stable: record.sourceStable !== false, recovered_after_restart: record.recoveredAfterRestart === true } }));
  }
  for (const run of artifactRuns) {
    const evidenceIds = run.artifacts.map(item => item.id);
    events.push(event({ id: `test-agent-artifacts:${run.run_id}`, at: run.finished_at || run.started_at, stage: "test", category: "test_evidence", status: normalizeStatus(run.status), title: `TestAgent 保存了 ${run.artifacts.length} 项验证证据`, summary: run.summary || run.recommendation, actor: actor("test_agent", "TestAgent"), task_id: run.task_id, source: "test_agent_artifacts", evidence_ids: evidenceIds, technical: { run_id: run.run_id, recommendation: run.recommendation, retained_until: run.retained_until, retention_status: run.retention_status } }));
  }
  return events;
}

function taskEvidence(tasks: any[], artifactRuns: ReturnType<typeof listTestAgentArtifactCatalogForTasks>) {
  const evidence: any[] = [];
  for (const task of tasks) {
    const summary = task.delivery_summary || {};
    const files = replayTaskChanges(task);
    if (files.length) {
      const projects = [...new Set(files.map(item => item.project).filter(Boolean))];
      const diffAvailableCount = files.filter(item => item.diff?.available === true).length;
      evidence.push({
        id: stableId("evidence", `${task.id}:files`),
        type: "code_changes",
        title: projects.length === 1 ? `${projects[0]} 代码改动` : "项目代码改动",
        task_id: task.id,
        project: projects.length === 1 ? projects[0] : task.target_project || "",
        status: "available",
        preview_kind: "code_diff",
        items: files.map(item => item.path),
        files,
        file_count: files.length,
        diff_available_count: diffAvailableCount,
        diff_unavailable_count: files.length - diffAvailableCount,
        retained_until: "任务删除前",
        url: "",
      });
    }
    const checks = [...new Set([...(summary.verification_executed || []), ...(summary.verification || []), ...(task.receipt?.verification || [])].map((item: any) => safeText(item?.command || item?.name || item, 240)).filter(Boolean))];
    if (checks.length) evidence.push({ id: stableId("evidence", `${task.id}:checks`), type: "verification", title: "项目子 Agent 验证记录", task_id: task.id, project: task.target_project || "", status: "available", preview_kind: "list", items: checks, retained_until: "任务删除前", url: "" });
  }
  for (const run of artifactRuns) for (const item of run.artifacts) evidence.push({ ...item, run_id: run.run_id, task_id: run.task_id, retained_until: run.retained_until, retention_status: run.retention_status, status: item.available ? run.retention_status : "expired", url: item.available ? `/api/tasks/replay/artifact?task_id=${encodeURIComponent(run.task_id)}&run_id=${encodeURIComponent(run.run_id)}&artifact_id=${encodeURIComponent(item.id)}` : "" });
  return evidence;
}

function dedupeAndSort(events: TaskReplayEvent[]) {
  const seen = new Set<string>();
  return events.filter(item => {
    const key = `${item.at}|${item.task_id}|${item.category}|${item.title}|${item.summary.slice(0, 160)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.at.localeCompare(b.at) || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.id.localeCompare(b.id));
}

function taskPublicRow(task: any, rootId: string) {
  return { id: String(task.id || ""), parent_task_id: String(task.parent_task_id || ""), root_task_id: rootId, title: taskLabel(task), goal: safeText(task.business_goal || task.description, 500), project: safeText(task.target_project, 100), group_id: String(task.group_id || ""), trace_id: String(task.trace_id || ""), status: String(task.status || "pending"), created_at: iso(task.created_at), updated_at: iso(task.updated_at), is_root: String(task.id) === rootId };
}

export function buildCompleteTaskReplay(taskId: string) {
  const family = taskFamily(String(taskId || ""));
  if (!family) return null;
  const ids = [...family.ids];
  const globalRecords = relatedGlobalRecords(family.ids);
  const artifactRuns = listTestAgentArtifactCatalogForTasks(ids);
  const extraTraceIds = [...globalRecords.runs.map(run => run.trace_id), ...globalRecords.supervisors.map(record => record.trace_id)].filter(Boolean);
  const events = dedupeAndSort([
    ...buildTaskEvents(family.tasks),
    ...buildMessageEvents(family.tasks),
    ...buildExecutionEvents(family.tasks),
    ...buildGlobalEvents(globalRecords, family.root),
    ...buildTestAgentEvents(ids, artifactRuns),
    ...buildJournalEvents(family.tasks),
    ...buildTraceEvents(family.tasks, extraTraceIds),
  ]);
  const evidence = taskEvidence(family.tasks, artifactRuns);
  const issueEvents = events.filter(item => ["failed", "blocked", "warning"].includes(item.status));
  const phases = STAGE_ORDER.map(stage => {
    const rows = events.filter(item => item.stage === stage);
    const status: TaskReplayStatus = rows.some(item => item.status === "failed") ? "failed" : rows.some(item => item.status === "blocked") ? "blocked" : rows.some(item => item.status === "warning") ? "warning" : rows.some(item => item.status === "running") ? "running" : rows.length ? "passed" : "info";
    return { id: stage, status, event_count: rows.length, started_at: rows[0]?.at || "", finished_at: rows.at(-1)?.at || "" };
  }).filter(row => row.event_count > 0);
  const rootStatus = String(family.root.status || "pending");
  return {
    schema: "ccm-complete-task-replay-v1",
    generated_at: new Date().toISOString(),
    selected_task_id: String(family.selected.id),
    root_task_id: String(family.root.id),
    title: taskLabel(family.root),
    goal: safeText(family.root.business_goal || family.root.description, 700),
    status: rootStatus,
    completed: TERMINAL.has(rootStatus.toLowerCase()),
    started_at: iso(family.root.started_at || family.root.created_at),
    finished_at: iso(family.root.completed_at || (TERMINAL.has(rootStatus.toLowerCase()) ? family.root.updated_at : "")),
    tasks: family.tasks.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""))).map(task => taskPublicRow(task, String(family.root.id))),
    actors: [
      { id: "global_agent", label: "全局主 Agent", present: globalRecords.runs.length > 0 },
      { id: "group_agent", label: "群聊主 Agent", present: family.tasks.some(task => !!task.group_id) },
      { id: "project_agent", label: "项目子 Agent", present: family.tasks.some(task => listExecutions({ taskId: task.id }).length > 0) },
      { id: "test_agent", label: "TestAgent", present: artifactRuns.length > 0 || listTestAgentRunnerRecords({ taskIds: ids, limit: 1 }).length > 0 },
    ],
    summary: { event_count: events.length, issue_count: issueEvents.length, failed_count: issueEvents.filter(item => item.status === "failed").length, task_count: family.tasks.length, evidence_count: evidence.length, test_run_count: artifactRuns.length },
    phases,
    events,
    evidence,
    retention: {
      task_record: { status: "available", policy: "任务删除前保留" },
      trace: { status: "available", policy: "完整任务日志保留到任务删除；快速 Trace 保留最近 1200 条" },
      test_agent: { status: artifactRuns.some(run => run.retention_status === "available") ? "available" : artifactRuns.length ? "expired" : "not_created", policy: "默认保留 14 天，且受 200 次运行和 2GB 上限约束", earliest_expiry: artifactRuns.map(run => run.retained_until).filter(Boolean).sort()[0] || "" },
    },
    replay_capabilities: { chronological: true, filters: ["stage", "status", "actor", "task", "search"], failure_navigation: true, evidence_preview: true, historical_line_diff: true, raw_machine_paths_exposed: false },
  };
}

export function buildTaskReplayIndex(limit = 40) {
  const tasks = loadTasks();
  const byId = new Map(tasks.map((task: any) => [String(task.id), task]));
  const roots = tasks.filter((task: any) => !task.parent_task_id || !byId.has(String(task.parent_task_id)))
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
    .slice(0, Math.max(1, Math.min(100, Number(limit || 40))));
  return {
    schema: "ccm-task-replay-index-v1",
    generated_at: new Date().toISOString(),
    total: roots.length,
    tasks: roots.map((task: any) => {
      const children = tasks.filter((item: any) => String(item.parent_task_id || "") === String(task.id));
      return { ...taskPublicRow(task, String(task.id)), child_count: children.length, replay_url: `/api/tasks/replay?task_id=${encodeURIComponent(task.id)}` };
    }),
  };
}

export function resolveTaskReplayArtifact(input: { taskId: string; runId: string; artifactId: string }): ResolvedTestAgentArtifact | null {
  return resolveTestAgentArtifactForTask(input);
}

export function runTaskReplayContractSelfTest() {
  const secret = safeText("api_key=secret-value C:\\Users\\someone\\private\\report.json");
  const change = normalizeReplayChange({
    path: "src/session.ts",
    project: "web",
    diff: { diff: "--- a/src/session.ts\n+++ b/src/session.ts\n@@ -4,1 +4,1 @@\n-oldValue\n+newValue" },
  });
  const unavailableChange = normalizeReplayChange({ path: "src/legacy.ts", additions: 2 }, "web");
  const journal = runTaskReplayJournalSelfTest();
  const checks = {
    secrets_redacted: secret.includes("[已隐藏]"),
    paths_redacted: secret.includes("[本机路径]"),
    status_normalized: normalizeStatus("failed") === "failed",
    browser_stage: inferStage("TestAgent browser screenshot") === "test",
    complete_journal: journal.pass,
    historical_line_diff_preserved: change?.diff?.available === true && change.diff.diff.includes("@@ -4,1 +4,1 @@"),
    missing_historical_diff_explained: unavailableChange?.diff?.available === false && /无法还原逐行代码内容/.test(unavailableChange.diff.reason),
  };
  return {
    schema: "ccm-task-replay-contract-selftest-v1",
    pass: Object.values(checks).every(Boolean),
    checks,
  };
}
