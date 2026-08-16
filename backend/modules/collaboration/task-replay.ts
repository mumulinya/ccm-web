import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getConfigs, getConfigInfo, loadTasks } from "../../core/db";
import { listExecutions } from "../../agents/execution-kernel";
import { findGlobalAgentRunsForTaskIds } from "../../agents/global/global-agent-run-store";
import { findGlobalMissionSupervisorsForTaskIds } from "../../agents/global/mission-supervisor";
import { getTaskAgentSessionContinuity, listTaskAgentSessions } from "../../tasks/agent-sessions";
import { getTrace } from "../../system/reliability-ledger";
import { buildTaskConversationLinks } from "../../system/task-conversation-links";
import { listTaskReplayJournalEvents, runTaskReplayJournalSelfTest } from "../../system/task-replay-journal";
import {
  listTestAgentArtifactCatalogForTasks,
  resolveTestAgentArtifactForTask,
  type ResolvedTestAgentArtifact,
} from "../../test-agent/artifact-retention";
import { getTaskLogs, getTaskTimeline } from "./logs";
import { getGroupMessages, loadGroups } from "./storage";
import { buildTaskReplayDeliveryView, runTaskReplayDeliverySelfTest } from "./task-replay-delivery";
import { buildTaskReplayPlanView, buildTaskReplayWorkItemRows, runTaskReplayPlanSelfTest } from "./task-replay-plan";
import { buildTaskReplayPresentation, runTaskReplayPresentationSelfTest } from "./task-replay-presentation";
import { iso, normalizeStatus, publicFile, safeText, stableId, stringList, type TaskReplayStatus } from "./task-replay-shared";
import { listTestAgentRunnerRecords } from "./test-agent-runner";
import { getObservabilityDatabase, withImmediateObservabilityTransaction } from "../../system/observability-database";
import { captureRepoStateIdentity, compareRepoStateIdentity, listEvidence, repoStateFingerprint } from "../../system/unified-evidence-registry";
import { listUserVisibleAgentEvents } from "../../system/user-visible-agent-events";
import type { ToolDisplayDetailV1 } from "../../system/tool-display-projection";

export type TaskReplayStage = "intake" | "planning" | "dispatch" | "execution" | "change" | "test" | "rework" | "review" | "completion" | "system";
export type { TaskReplayStatus } from "./task-replay-shared";

export interface TaskReplayEvent {
  id: string;
  at: string;
  stage: TaskReplayStage;
  category: string;
  status: TaskReplayStatus;
  audience: "user" | "technical";
  title: string;
  summary: string;
  actor: { type: "user" | "global_agent" | "group_agent" | "project_agent" | "test_agent" | "system"; label: string };
  task_id: string;
  parent_task_id: string;
  trace_id: string;
  project: string;
  source: string;
  evidence_ids: string[];
  tool_display?: ToolDisplayDetailV1;
  file_changes?: Array<{ path: string; project?: string; status?: string; additions?: number; deletions?: number; binary?: boolean; deleted?: boolean }>;
  replay_link?: {
    schema: "ccm-task-event-link-v1";
    taskId: string;
    replayEventId?: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    anchorMessageId: string;
    generation: number;
    attempt: number;
    planStepId?: string;
    workItemId?: string;
    batchId?: string;
    evidenceIds?: string[];
    contentStored: false;
  };
  causal_refs?: {
    planStepId?: string;
    workItemId?: string;
    dependencyIds?: string[];
    criterionIds?: string[];
    evidenceIds?: string[];
  };
  technical?: Record<string, any>;
}

export interface TaskReplayEventPageOptions {
  eventOffset?: number;
  eventLimit?: number;
  eventTail?: boolean;
  afterEventAt?: string;
  afterEventId?: string;
  stage?: string;
  status?: string;
  actor?: string;
  task?: string;
  query?: string;
  preset?: string;
  includeSystemEvents?: boolean;
  includeDetails?: boolean;
}

export interface TaskReplayIndexOptions {
  page?: number;
  limit?: number;
  query?: string;
  project?: string;
  groupId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

const STAGE_ORDER: TaskReplayStage[] = ["intake", "planning", "dispatch", "execution", "change", "test", "rework", "review", "completion", "system"];
const TERMINAL = new Set(["done", "completed", "failed", "blocked", "cancelled", "reverted"]);

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
  return [...byFile.values()];
}

function inferStage(sourceValue: any, categoryValue: any): TaskReplayStage {
  const source = String(sourceValue || "").toLowerCase();
  const category = String(categoryValue || "").toLowerCase();
  const exact: Record<string, TaskReplayStage> = {
    task: "intake", message: "intake", plan: "planning", plan_mode: "planning", plan_revision: "planning", plan_confirmed: "planning",
    work_item: "dispatch", dispatch: "dispatch", execution: "execution", agent_session: "execution",
    code_changes: "change", file_change: "change", commit: "change", test_run: "test", test_plan: "test", test_evidence: "test",
    rework: "rework", retry: "rework", acceptance: "review", review: "review", task_status: "completion", global_summary: "completion", delivery: "completion",
  };
  if (exact[category]) return exact[category];
  if (source === "test_agent_runner" || source === "test_agent_artifacts") return "test";
  if (source === "execution" || source === "agent_session") return "execution";
  if (source === "work_item") return "dispatch";
  if (source === "plan") return "planning";
  if (source === "group_message" || source === "project_message") return "intake";
  return "system";
}

// 回放的意义在于让用户看懂发生了什么，所以默认按"是否是人话"而不是按来源整类隐藏：
// 只要事件带有叙述性文字（或本身是问题），就归为 user，默认展示；只有纯机器标识（agent.run 这类）才归 technical。
const LOW_LEVEL_SOURCES = new Set(["trace", "journal", "task_log", "execution"]);
const NARRATIVE_TEXT = /[一-龥]/;

function eventAudience(input: { source: string; status: TaskReplayStatus; title: string; summary: string }): "user" | "technical" {
  if (["failed", "blocked", "warning"].includes(input.status)) return "user";
  if (!LOW_LEVEL_SOURCES.has(input.source)) return "user";
  // task_log 的标题是统一套壳文案，只有正文能反映是否人话；其余低层来源标题可能就是子 Agent 的原话。
  const narrative = (input.source === "task_log" ? input.summary : `${input.title} ${input.summary}`).trim();
  return narrative.length >= 6 && NARRATIVE_TEXT.test(narrative) ? "user" : "technical";
}

function actor(type: TaskReplayEvent["actor"]["type"], label: string) {
  const defaults = { user: "用户", global_agent: "全局主 Agent", group_agent: "群聊主 Agent", project_agent: "项目子 Agent", test_agent: "TestAgent", system: "系统" };
  return { type, label: safeText(label || defaults[type], 80) || defaults[type] };
}

function event(input: Partial<TaskReplayEvent> & Pick<TaskReplayEvent, "title">): TaskReplayEvent {
  const source = String(input.source || "task");
  const at = iso(input.at, new Date(0).toISOString());
  const status = input.status || "info";
  const title = safeText(input.title, 180) || "任务记录";
  const rawSummary = safeText(input.summary, 1200);
  // 摘要和标题一字不差时重复渲染两遍纯属噪音（journal 来源大量如此），只保留标题。
  const summary = rawSummary === title ? "" : rawSummary;
  return {
    id: String(input.id || stableId("tre", { source, at, title: input.title, task: input.task_id })),
    at,
    stage: input.stage || inferStage(source, input.category),
    category: String(input.category || "event"),
    status,
    audience: input.audience || eventAudience({ source, status, title, summary }),
    title,
    summary,
    actor: input.actor || actor("system", "系统"),
    task_id: String(input.task_id || ""),
    parent_task_id: String(input.parent_task_id || ""),
    trace_id: String(input.trace_id || ""),
    project: safeText(input.project, 100),
    source,
    evidence_ids: [...new Set(input.evidence_ids || [])],
    ...(input.tool_display ? { tool_display: input.tool_display } : {}),
    ...(input.file_changes?.length ? { file_changes: input.file_changes } : {}),
    ...(input.replay_link ? { replay_link: input.replay_link } : {}),
    ...(input.causal_refs ? { causal_refs: input.causal_refs } : {}),
    ...(input.technical ? { technical: safeTechnical(input.technical) } : {}),
  };
}

function replayTaskScope(task: any): { scope: "global" | "project" | "group"; scopeId: string; exactSessionId: string; anchorMessageId: string } {
  if (task?.group_id) return {
    scope: "group",
    scopeId: String(task.group_id || ""),
    exactSessionId: String(task.group_session_id || task.groupSessionId || "default"),
    anchorMessageId: String(task.anchor_message_id || task.anchorMessageId || task.target_message_id || task.targetMessageId || ""),
  };
  if (task?.target_project || task?.project_session_id) return {
    scope: "project",
    scopeId: String(task.target_project || ""),
    exactSessionId: String(task.project_session_id || task.projectSessionId || task.exact_session_id || ""),
    anchorMessageId: String(task.anchor_message_id || task.anchorMessageId || task.target_message_id || task.targetMessageId || ""),
  };
  return {
    scope: "global",
    scopeId: String(task.scope_id || task.scopeId || "global"),
    exactSessionId: String(task.origin_session_id || task.exact_session_id || task.global_session_id || ""),
    anchorMessageId: String(task.origin_message_id || task.anchor_message_id || task.anchorMessageId || ""),
  };
}

function addReplayEventLinks(events: TaskReplayEvent[], tasks: any[]) {
  const byId = new Map(tasks.map(task => [String(task.id || ""), task]));
  return events.map(row => {
    const task = byId.get(String(row.task_id || "")) || tasks[0] || {};
    const identity = replayTaskScope(task);
    const technical = row.technical || {};
    const planStepId = safeText(technical.plan_step_id || technical.planStepId, 120);
    const workItemId = safeText(technical.work_item_id || technical.workItemId, 120);
    const batchId = safeText(technical.batch_id || technical.batchId, 120);
    const dependencyIds = stringList(technical.dependency_ids || technical.dependencyIds || technical.blocked_by, 30);
    const criterionIds = stringList(technical.criterion_ids || technical.criterionIds, 30);
    const evidenceIds = [...new Set(row.evidence_ids || [])];
    return {
      ...row,
      replay_link: {
        schema: "ccm-task-event-link-v1" as const,
        taskId: String(row.task_id || task.id || ""),
        replayEventId: String(row.id || ""),
        ...identity,
        generation: Math.max(0, Number(technical.generation || task.generation || task.execution_generation || 0)),
        attempt: Math.max(1, Number(technical.attempt || task.attempt || 1)),
        ...(planStepId ? { planStepId } : {}),
        ...(workItemId ? { workItemId } : {}),
        ...(batchId ? { batchId } : {}),
        ...(evidenceIds.length ? { evidenceIds } : {}),
        contentStored: false as const,
      },
      causal_refs: {
        ...(planStepId ? { planStepId } : {}),
        ...(workItemId ? { workItemId } : {}),
        ...(dependencyIds.length ? { dependencyIds } : {}),
        ...(criterionIds.length ? { criterionIds } : {}),
        ...(evidenceIds.length ? { evidenceIds } : {}),
      },
    };
  });
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

function taskOwnerActor(task: any) {
  if (task?.orchestration_scope === "project_session") return actor("project_agent", "项目主 Agent");
  if (task?.workflow_type === "global_mission" || task?.assign_type === "global") return actor("global_agent", "全局主 Agent");
  return actor("group_agent", "群聊主 Agent");
}

// 门禁/检查类时间线事件常只带"N 项未通过"的计数文本，明细在 data.failed_checks / data.checks 里；
// 把未通过项拼进摘要、完整清单放进技术详情，用户才能看懂到底是哪些没过。
function failedCheckLines(data: any) {
  const rows = Array.isArray(data?.failed_checks) && data.failed_checks.length
    ? data.failed_checks
    : Array.isArray(data?.checks) ? data.checks.filter((row: any) => row && row.ok === false) : [];
  return rows.map((row: any) => {
    const label = safeText(row?.label || row?.id, 80);
    const detail = safeText(row?.detail || row?.reason, 160);
    return label ? (detail && detail !== "通过" && detail !== label ? `${label}（${detail}）` : label) : detail;
  }).filter(Boolean).slice(0, 10);
}

function timelineSummary(item: any) {
  const base = safeText(item?.detail || item?.message, 600);
  const data = item?.data && typeof item.data === "object" ? item.data : null;
  if (!data) return base;
  const failed = failedCheckLines(data);
  if (failed.length) return `${base || `${failed.length} 项未通过`}：${failed.join("；")}`;
  return base || safeText(data.user_detail || data.userDetail || data.headline || data.reason || data.summary, 600);
}

function timelineTechnical(item: any) {
  const data = item?.data && typeof item.data === "object" ? item.data : null;
  if (!data) return undefined;
  const checks = Array.isArray(data.checks)
    ? data.checks.slice(0, 30).map((row: any) => ({ label: safeText(row?.label || row?.id, 80), ok: row?.ok === true, detail: safeText(row?.detail, 160) }))
    : [];
  const semanticReceipt = data.semantic_decision_receipt || data.semanticDecisionReceipt || null;
  const routeDecision = data.route_decision || data.routeDecision || null;
  return {
    phase: item.phase || "",
    files: stringList(data.files || data.files_changed, 30),
    ...(checks.length ? { passed_count: checks.filter(row => row.ok).length, failed_count: checks.filter(row => !row.ok).length, checks } : {}),
    ...(semanticReceipt ? {
      semantic_decision: {
        type: semanticReceipt.decisionKind || semanticReceipt.decision_kind || "",
        status: semanticReceipt.status || "",
        model: semanticReceipt.model || "",
        confidence: semanticReceipt.confidence,
        checksum: semanticReceipt.checksum || "",
        input_checksum: semanticReceipt.inputChecksum || semanticReceipt.input_checksum || "",
        result_checksum: semanticReceipt.resultChecksum || semanticReceipt.result_checksum || "",
      },
    } : {}),
    ...(routeDecision ? {
      semantic_reason: safeText(routeDecision.reason, 600),
      semantic_action: routeDecision.action || "",
      semantic_target: routeDecision.targetProject || routeDecision.target_project || "",
    } : {}),
  };
}

function replayTaskMessages(tasks: any[]) {
  const rows: Array<{ task: any; source: string; message: any }> = [];
  for (const task of tasks) {
    let messages: any[] = [];
    let source = "group_message";
    if (task.group_id) {
      messages = getGroupMessages(task.group_id, String(task.group_session_id || task.groupSessionId || "default"));
    } else if (task.project_session_id && task.target_project) {
      try {
        const session = require("../projects/sessions").getSessionDetail(task.target_project, task.project_session_id);
        messages = Array.isArray(session?.history) ? session.history : [];
        source = "project_message";
      } catch {}
    }
    for (const message of messages) {
      if (String(message?.task_id || message?.taskExperience?.task_id || message?.task?.id || "") === String(task.id)) rows.push({ task, source, message });
    }
  }
  return rows;
}

function userVisibleEventsForTask(task: any, max = 5000) {
  const identity = replayTaskScope(task);
  if (!identity.scopeId || !identity.exactSessionId) return [];
  const rows: any[] = [];
  let cursor = 0;
  try {
    while (rows.length < max) {
      const page = listUserVisibleAgentEvents({ scope: identity.scope, scopeId: identity.scopeId, exactSessionId: identity.exactSessionId, cursor, limit: Math.min(500, max - rows.length) });
      for (const row of page.events || []) if (String(row.taskId || "") === String(task.id || "")) rows.push(row);
      const next = Number(page.nextCursor || cursor);
      if (!page.hasMore || next <= cursor) break;
      cursor = next;
    }
  } catch {}
  return rows;
}

function replayMutableSourceIdentity(family: any, extraTraceIds: string[]) {
  const traceIds = [...new Set([...family.tasks.map((task: any) => String(task.trace_id || "")), ...extraTraceIds].filter(Boolean))];
  const traces = traceIds.map(traceId => {
    const rows = getTrace(traceId)?.events || [];
    const last = rows.at(-1) || {};
    return { trace_id: traceId, event_count: rows.length, last_id: last.id || "", last_at: last.at || "", last_status: last.status || "" };
  });
  const journals = listTaskReplayJournalEvents(family.tasks.map((task: any) => String(task.id)));
  const executions = family.tasks.flatMap((task: any) => listExecutions({ taskId: task.id }).map((execution: any) => ({
    id: execution.id,
    state: execution.state,
    updated_at: execution.updatedAt || execution.updated_at,
    event_count: Array.isArray(execution.events) ? execution.events.length : 0,
    last_event_id: Array.isArray(execution.events) ? execution.events.at(-1)?.id || "" : "",
  })));
  const sessions = family.tasks.flatMap((task: any) => listTaskAgentSessions({ taskId: task.id }).map((session: any) => ({
    id: session.id,
    status: session.status,
    last_used_at: session.lastUsedAt,
    turn_count: session.turnCount,
  })));
  const messages = replayTaskMessages(family.tasks).map(({ task, source, message }) => ({
    task_id: String(task.id), source, id: String(message.id || ""), at: message.timestamp || message.created_at || "",
    role: message.role || "", status: message.status || "",
    checksum: crypto.createHash("sha256").update(String(message.content || message.summary || "")).digest("hex"),
  }));
  const userVisibleEvents = family.tasks.map((task: any) => {
    const identity = replayTaskScope(task);
    if (!identity.scopeId || !identity.exactSessionId) return { task_id: String(task.id || ""), event_count: 0, last_id: "", last_sequence: 0 };
    try {
      const rows = userVisibleEventsForTask(task);
      const last = rows.at(-1) || {};
      return { task_id: String(task.id || ""), event_count: rows.length, last_id: last.eventId || "", last_sequence: Number(last.sequence || 0) };
    } catch { return { task_id: String(task.id || ""), event_count: 0, last_id: "", last_sequence: 0 }; }
  });
  return {
    traces,
    journals: {
      count: journals.length,
      checksum: crypto.createHash("sha256").update(JSON.stringify(journals.map((row: any) => ({
        task_id: row.task_id,
        recorded_at: row.recorded_at,
        id: row.event?.id || "",
        status: row.event?.status || "",
      })))).digest("hex"),
    },
    executions,
    sessions,
    messages: { count: messages.length, checksum: crypto.createHash("sha256").update(JSON.stringify(messages)).digest("hex") },
    user_visible_events: userVisibleEvents,
  };
}

function replaySourceChecksum(family: any, globalRecords: any, artifactRuns: any[], mutableSources: any) {
  const payload = {
    replay_projection_version: 5,
    tasks: family.tasks.map((task: any) => ({
      id: task.id,
      updated_at: task.updated_at,
      status: task.status,
      acceptance_state: task.acceptance_state,
      timeline_size: Array.isArray(task.timeline) ? task.timeline.length : 0,
      logs_size: Array.isArray(task.logs) ? task.logs.length : 0,
      result_checksum: task.result_checksum || task.terminal_state_receipt?.checksum || "",
    })),
    global_runs: globalRecords.runs.map((run: any) => ({ id: run.id, status: run.status, updated_at: run.updated_at, trace_id: run.trace_id })),
    supervisors: globalRecords.supervisors.map((item: any) => ({ id: item.id, status: item.status, updated_at: item.updated_at, trace_id: item.trace_id })),
    artifacts: artifactRuns.map((run: any) => ({ run_id: run.run_id, task_id: run.task_id, status: run.status, updated_at: run.updated_at, artifacts: run.artifacts?.length || 0 })),
    mutable_sources: mutableSources,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function readMaterializedReplayEvents(taskId: string, sourceChecksum: string): TaskReplayEvent[] | null {
  const db = getObservabilityDatabase();
  const snapshot = db.prepare("SELECT event_count FROM task_replay_event_snapshots_v2 WHERE task_id=? AND source_checksum=?").get(taskId, sourceChecksum) as any;
  if (!snapshot) return null;
  const rows = db.prepare("SELECT event_json FROM task_replay_events_v2 WHERE task_id=? AND source_checksum=? ORDER BY sequence").all(taskId, sourceChecksum) as any[];
  if (rows.length !== Number(snapshot.event_count || 0)) return null;
  try { return rows.map(row => JSON.parse(row.event_json)); } catch { return null; }
}

function storeMaterializedReplayEvents(taskId: string, sourceChecksum: string, events: TaskReplayEvent[]) {
  withImmediateObservabilityTransaction((db) => {
    const insert = db.prepare("INSERT OR REPLACE INTO task_replay_events_v2(task_id,source_checksum,sequence,event_id,at,stage,status,actor_type,event_json) VALUES(?,?,?,?,?,?,?,?,?)");
    events.forEach((event, index) => insert.run(taskId, sourceChecksum, index, event.id, event.at, event.stage, event.status, event.actor?.type || "", JSON.stringify(event)));
    db.prepare("INSERT OR REPLACE INTO task_replay_event_snapshots_v2(task_id,source_checksum,generated_at,event_count,summary_json) VALUES(?,?,?,?,?)")
      .run(taskId, sourceChecksum, new Date().toISOString(), events.length, JSON.stringify({ first: events[0]?.id || "", last: events.at(-1)?.id || "" }));
    db.prepare("DELETE FROM task_replay_events_v2 WHERE task_id=? AND source_checksum<>?").run(taskId, sourceChecksum);
  });
}

function storeReplaySourceManifest(taskId: string, sourceChecksum: string, eventCount: number, mutableSources: any) {
  const generation = `trv3_${sourceChecksum.slice(0, 24)}`;
  const now = new Date().toISOString();
  const manifest = {
    schema: "ccm-task-replay-source-manifest-v3",
    generation,
    task_id: taskId,
    source_checksum: sourceChecksum,
    sources: {
      traces: mutableSources.traces?.length || 0,
      journal_events: mutableSources.journals?.count || 0,
      executions: mutableSources.executions?.length || 0,
      agent_sessions: mutableSources.sessions?.length || 0,
      conversation_messages: mutableSources.messages?.count || 0,
      user_visible_events: mutableSources.user_visible_events?.reduce((sum: number, row: any) => sum + Number(row.event_count || 0), 0) || 0,
    },
  };
  withImmediateObservabilityTransaction((db) => {
    db.prepare("INSERT OR REPLACE INTO task_replay_source_manifests_v3(task_id,generation,source_checksum,source_manifest_json,event_count,created_at,active) VALUES(?,?,?,?,?,?,0)")
      .run(taskId, generation, sourceChecksum, JSON.stringify(manifest), eventCount, now);
    db.prepare("UPDATE task_replay_source_manifests_v3 SET active=0 WHERE task_id=?").run(taskId);
    db.prepare("UPDATE task_replay_source_manifests_v3 SET active=1 WHERE task_id=? AND generation=?").run(taskId, generation);
    db.prepare("DELETE FROM task_replay_source_manifests_v3 WHERE task_id=? AND active=0 AND generation NOT IN (SELECT generation FROM task_replay_source_manifests_v3 WHERE task_id=? ORDER BY created_at DESC LIMIT 3)").run(taskId, taskId);
  });
}

function buildTaskEvents(tasks: any[]) {
  const events: TaskReplayEvent[] = [];
  for (const task of tasks) {
    const taskId = String(task.id || "");
    const owner = taskOwnerActor(task);
    const semanticReceipt = task.semantic_decision_receipt || task.workflow_decision?.semantic_decision_receipt || null;
    events.push(event({ id: `task:${taskId}:created`, at: task.created_at, stage: "intake", category: "task", status: "info", title: task.parent_task_id ? `${owner.label}创建分派任务` : "任务已创建", summary: taskLabel(task), actor: task.parent_task_id ? owner : actor("user", "用户"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: task.target_project, source: "task", technical: {
      request_origin: task.request_origin || "",
      origin_session_id: task.origin_session_id || "",
      queue_scope: task.queue_scope || "",
      ...(semanticReceipt ? { semantic_decision: {
        type: semanticReceipt.decisionKind || semanticReceipt.decision_kind || "",
        status: semanticReceipt.status || "",
        model: semanticReceipt.model || "",
        confidence: semanticReceipt.confidence,
        checksum: semanticReceipt.checksum || "",
      } } : {}),
    } }));
    for (const item of getTaskTimeline(task)) {
      events.push(event({ id: `timeline:${taskId}:${item.id || stableId("row", item)}`, at: item.at, category: String(item.type || "timeline"), status: normalizeStatus(item.status), title: item.title || item.type || "任务进展", summary: timelineSummary(item), actor: item.agent ? actor(/test.?agent/i.test(item.agent) ? "test_agent" : "project_agent", item.agent) : actor("group_agent", "群聊主 Agent"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: item.agent || task.target_project, source: "timeline", technical: timelineTechnical(item) }));
    }
    for (const [index, item] of getTaskLogs(taskId, 100).entries()) {
      events.push(event({ id: `task-log:${taskId}:${index}:${item.timestamp}`, at: item.timestamp, category: "task_log", status: normalizeStatus(item.level), title: item.level === "error" ? "任务运行异常" : item.level === "warning" ? "任务运行提示" : "任务运行记录", summary: item.message, actor: actor("system", "任务运行器"), task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, source: "task_log" }));
    }
    if (task.updated_at && TERMINAL.has(String(task.status || "").toLowerCase())) {
      const summary = task.final_report || task.delivery_summary?.user_report || task.result || task.status_detail || taskLabel(task);
      events.push(event({ id: `task:${taskId}:terminal`, at: task.completed_at || task.updated_at, stage: "completion", category: "task_status", status: normalizeStatus(task.status), title: normalizeStatus(task.status) === "passed" ? "任务已完成并形成总结" : `任务${task.status === "cancelled" ? "已取消" : "已结束"}`, summary, actor: owner, task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, source: "task" }));
    }
  }
  return events;
}

// 执行期实时计划不持久化在任务记录上，挂在群消息的 main_agent_decision.todo_plan；取该任务最近一条。
function latestGroupTodoPlan(task: any) {
  if (!task?.group_id) return null;
  try {
    const sessionId = String(task.group_session_id || task.groupSessionId || "default");
    const messages = getGroupMessages(task.group_id, sessionId);
    for (let index = messages.length - 1; index >= 0; index--) {
      const message: any = messages[index];
      if (String(message?.task_id || message?.task?.id || message?.taskExperience?.task_id || "") !== String(task.id || "")) continue;
      const decision = message?.mainAgentDecision || message?.main_agent_decision;
      const todo = decision?.todo_plan || decision?.todoPlan;
      if (todo && Array.isArray(todo.steps) && todo.steps.length) return todo;
    }
  } catch {}
  return null;
}

// 计划书与工作单：结构化数据块 + 让"计划/派发"阶段可读的合成事件。
function buildPlanAndWorkItemData(tasks: any[]) {
  const plans: any[] = [];
  const workItems: any[] = [];
  const events: TaskReplayEvent[] = [];
  for (const task of tasks) {
    const taskId = String(task.id || "");
    const owner = taskOwnerActor(task);
    const base = { task_id: taskId, parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: task.target_project };
    const plan = buildTaskReplayPlanView(task, { fallbackTodo: latestGroupTodoPlan(task) });
    if (plan) {
      plans.push(plan);
      if (plan.source === "plan_mode") {
        events.push(event({ ...base, id: `plan:${taskId}:generated`, at: plan.generated_at, stage: "planning", category: "plan_mode", status: "passed", title: `${owner.label}生成${plan.title}（${plan.step_count} 步）`, summary: plan.steps.slice(0, 6).map(step => step.title).join("；"), actor: owner, source: "plan", technical: { plan_source: plan.source, step_count: plan.step_count, impact_projects: plan.impact_projects, acceptance: plan.acceptance } }));
        for (const revision of plan.revisions) {
          if (!revision.at) continue;
          events.push(event({ ...base, id: `plan:${taskId}:revision:${revision.count}`, at: revision.at, stage: "planning", category: "plan_revision", status: "info", title: `计划书完成第 ${revision.count} 次修订`, summary: revision.feedback, actor: actor("user", "用户"), source: "plan" }));
        }
        if (plan.confirmed && plan.confirmed_at) {
          events.push(event({ ...base, id: `plan:${taskId}:confirmed`, at: plan.confirmed_at, stage: "planning", category: "plan_confirmed", status: "passed", title: "执行前计划已确认", summary: plan.next_step || "计划确认后进入派发。", actor: actor("user", "用户"), source: "plan" }));
        }
      }
    }
    for (const row of buildTaskReplayWorkItemRows(task, listExecutions({ taskId: task.id }))) {
      workItems.push(row);
      events.push(event({ ...base, id: `work-item:${taskId}:${row.id}`, at: row.created_at || iso(task.created_at), stage: "dispatch", category: "work_item", status: normalizeStatus(row.status), title: `${owner.label}派发工作单给 ${row.target || row.owner || "执行成员"}`, summary: [row.subject, row.receipt_summary].filter(Boolean).join(" — "), actor: owner, project: row.target || task.target_project, source: "work_item", technical: { work_item_id: row.id, status: row.status, attempt: row.attempt, files_changed: row.files_changed.slice(0, 10), verification: row.verification.slice(0, 6), blocked_by: row.blocked_by } }));
    }
  }
  return { plans, workItems, events };
}

function buildMessageEvents(tasks: any[]) {
  const events: TaskReplayEvent[] = [];
  for (const [index, row] of replayTaskMessages(tasks).entries()) {
      const { task, source, message } = row;
      const content = safeText(message.content || message.summary, 1000);
      if (!content || /CCM_AGENT_RECEIPT/i.test(String(message.content || ""))) continue;
      const who = messageActor(message);
      events.push(event({ id: `message:${message.id || stableId("msg", { index, content })}`, at: message.timestamp || message.created_at, stage: message.role === "user" ? "intake" : undefined, category: "message", status: normalizeStatus(message.status), title: who.type === "user" ? "用户补充任务要求" : source === "project_message" ? "项目主 Agent 更新进展" : who.type === "project_agent" ? `${who.label} 返回工作结果` : "群聊主 Agent 更新进展", summary: content, actor: source === "project_message" && message.role !== "user" ? actor("project_agent", "项目主 Agent") : who, task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: message.trace_id || task.trace_id, project: message.project || message.agent || task.target_project, source }));
  }
  return events;
}

// 执行记录里的 state 是机器词（queued/running/done…），直接显示用户读不懂，统一换成中文说法。
const EXECUTION_STATE_TEXT: Record<string, string> = {
  queued: "已排队等待执行", pending: "已排队等待执行", spawning: "正在启动工作会话", ready: "已就绪",
  running: "正在执行", executing: "正在执行", reviewing: "正在等待验收",
  done: "已完成执行", completed: "已完成执行", succeeded: "已完成执行",
  failed: "执行失败", error: "执行失败", cancelled: "执行已取消", canceled: "执行已取消",
};

function executionStateText(state: any) {
  return EXECUTION_STATE_TEXT[String(state || "").toLowerCase()] || "";
}

function buildExecutionEvents(tasks: any[]) {
  const events: TaskReplayEvent[] = [];
  for (const task of tasks) {
    for (const executionRecord of listExecutions({ taskId: task.id })) {
      const execution: any = executionRecord;
      const agentName = execution.project || execution.agent || "项目子 Agent";
      const rows = Array.isArray(execution.events) ? execution.events : [];
      for (const [index, row] of rows.entries()) {
        const rowStateText = executionStateText(row.state || row.status);
        events.push(event({ id: `execution:${execution.id}:${row.id || index}`, at: row.at || row.timestamp, category: row.name || row.type || "execution", status: normalizeStatus(row.status || row.state), title: safeText(row.message || row.name || (rowStateText ? `${agentName} ${rowStateText}` : `${agentName} 执行记录`), 180), summary: safeText(row.message || row.detail, 1200) || (rowStateText ? `${agentName} ${rowStateText}。` : ""), actor: actor("project_agent", agentName), task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: execution.project, source: "execution", technical: { execution_id: execution.id, runtime: execution.runtime || execution.packet?.agentType || "", state: row.state || execution.state || "", failure_class: row.failureClass || execution.failure?.class || "" } }));
      }
      if (!rows.length) {
        const stateText = executionStateText(execution.state) || "执行";
        events.push(event({ id: `execution:${execution.id}`, at: execution.updatedAt || execution.createdAt, stage: "execution", category: "execution", status: normalizeStatus(execution.state), title: `${agentName} ${stateText}`, summary: safeText(execution.failure?.message, 1200) || `${agentName} ${stateText}。`, actor: actor("project_agent", agentName), task_id: String(task.id), parent_task_id: task.parent_task_id, trace_id: task.trace_id, project: execution.project, source: "execution", technical: { execution_id: execution.id, runtime: execution.runtime || execution.packet?.agentType || "" } }));
      }
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
  const runs = findGlobalAgentRunsForTaskIds(ids);
  const runIds = new Set(runs.map(run => run.id));
  const supervisors = findGlobalMissionSupervisorsForTaskIds(ids, runIds);
  return { runs, supervisors };
}

function userVisibleReplayStage(row: any): TaskReplayStage {
  const explicit = String(row?.detail?.executionStage?.kind || "");
  if (explicit === "preparation") return "execution";
  if (explicit === "project_execution") return "execution";
  if (explicit === "independent_verification") return "test";
  if (explicit === "main_agent_summary") return "review";
  if (row.eventType === "requirement_plan") return "planning";
  if (String(row.eventType || "").startsWith("agent_")) return /test.?agent/i.test(String(row?.detail?.agentDisplay?.runtimeLabel || row?.display?.title || "")) ? "test" : "execution";
  if (String(row.eventType || "").startsWith("tool_")) return "execution";
  if (row.eventType === "result") return "completion";
  return "system";
}

function buildUserVisibleExecutionEvents(tasks: any[]) {
  const output: TaskReplayEvent[] = [];
  for (const task of tasks) {
    const identity = replayTaskScope(task);
    if (!identity.scopeId || !identity.exactSessionId) continue;
    const rows = userVisibleEventsForTask(task);
    for (const row of rows) {
      if (String(row.taskId || "") !== String(task.id || "")) continue;
      if (["assistant_text_delta", "thinking_status", "turn_started"].includes(String(row.eventType))) continue;
      const project = safeText(row?.detail?.agentDisplay?.projectName || row?.detail?.agentDisplay?.projectId || task.target_project, 100);
      const actorType = /test.?agent/i.test(String(row?.detail?.agentDisplay?.runtimeLabel || row?.display?.title || "")) ? "test_agent"
        : String(row.eventType || "").startsWith("agent_") ? "project_agent"
          : row.scope === "global" ? "global_agent" : row.scope === "group" ? "group_agent" : "project_agent";
      const progress = row?.detail?.progress || {};
      const actionRows = Array.isArray(row?.detail?.availableActions) ? row.detail.availableActions : [];
      output.push(event({
        id: String(row.eventId || stableId("uve", row)), at: row.createdAt, stage: userVisibleReplayStage(row), category: String(row.eventType || "execution_event"),
        status: row.display?.status === "success" ? "passed" : row.display?.status === "failed" ? "failed" : row.display?.status === "waiting" ? "blocked" : "running",
        title: row.display?.title || "Agent 执行进展", summary: row.display?.summary || progress.text || "", actor: actor(actorType as any, row?.detail?.agentDisplay?.runtimeLabel || project || undefined),
        task_id: String(task.id || ""), parent_task_id: String(task.parent_task_id || ""), trace_id: String(task.trace_id || ""), project, source: "user_visible_agent_event", evidence_ids: row?.detail?.evidenceIds || [],
        tool_display: row?.detail?.toolDisplay,
        file_changes: row?.detail?.fileChanges || [],
        technical: {
          generation: row.generation, attempt: row?.detail?.agentDisplay?.attempt || row?.detail?.executionStage?.attempt || 1,
          work_item_id: row.workItemId || row?.detail?.causalRefs?.workItemId || "", plan_step_id: row?.detail?.causalRefs?.planStepId || "", batch_id: progress.batchId || "",
          tool_call_id: row.toolCallId || "", related_tool_call_ids: progress.relatedToolCallIds || [],
          dependency_ids: row?.detail?.causalRefs?.dependencyIds || [], criterion_ids: row?.detail?.causalRefs?.criterionIds || [], progress_source: progress.source || row?.detail?.runtimeObservation?.source || "",
          ...(actionRows.length ? { available_actions: actionRows } : {}),
        },
      }));
    }
  }
  return output;
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
    const semanticReceipt = report.semanticDecisionReceipt || report.semantic_decision_receipt || invocation.semanticDecisionReceipt || invocation.semantic_decision_receipt || null;
    const criterionCoverage = report.criterionCoverage || report.criterion_coverage || [];
    events.push(event({ id: `test-agent-run:${record.id}`, at: record.finishedAt || record.startedAt || record.createdAt, stage: record.mode === "plan" ? "planning" : "test", category: record.mode === "plan" ? "test_plan" : "test_run", status: normalizeStatus(record.status === "completed" && invocation.canAccept !== false ? "passed" : record.status), title, summary, actor: actor("test_agent", "TestAgent"), task_id: record.taskId, source: "test_agent_runner", technical: {
      run_id: record.id,
      mode: record.mode,
      duration_ms: Math.max(0, Date.parse(record.finishedAt || record.heartbeatAt) - Date.parse(record.startedAt || record.createdAt)),
      outcome: invocation.outcome || "",
      recommendation: invocation.recommendation || "",
      can_accept: invocation.canAccept === true,
      source_stable: record.sourceStable !== false,
      recovered_after_restart: record.recoveredAfterRestart === true,
      criterion_coverage: Array.isArray(criterionCoverage) ? criterionCoverage.slice(0, 60) : [],
      unplanned_criteria: Array.isArray(report.unplannedCriteria || report.unplanned_criteria) ? (report.unplannedCriteria || report.unplanned_criteria).slice(0, 60) : [],
      ...(semanticReceipt ? { semantic_decision: {
        type: semanticReceipt.decisionKind || semanticReceipt.decision_kind || "test_agent_plan",
        status: semanticReceipt.status || "",
        model: semanticReceipt.model || "",
        confidence: semanticReceipt.confidence,
        checksum: semanticReceipt.checksum || "",
      } } : {}),
    } }));
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

// 同一件事会被 timeline / journal / trace 各记一遍（标题措辞不同、正文相同），逐条展示等于让用户读三遍。
// 归并键取"任务 + 分钟 + 正文语义"，正文为空时退回标题；保留叙述性最强的来源，其余并入 merged_sources。
const SOURCE_PRIORITY = ["task", "plan", "work_item", "user_visible_agent_event", "group_message", "project_message", "global_agent", "mission_supervisor", "test_agent_runner", "test_agent_artifacts", "timeline", "agent_session", "execution", "journal", "trace", "task_log"];

function sourceRank(source: string) {
  const index = SOURCE_PRIORITY.indexOf(source);
  return index < 0 ? SOURCE_PRIORITY.length : index;
}

function mergeKey(item: TaskReplayEvent) {
  const semantic = (item.summary || item.title).replace(/[\s。，、；：!！?？.,;:—\-]/g, "").slice(0, 80);
  return `${item.task_id}|${item.at.slice(0, 16)}|${item.status}|${semantic}`;
}

function dedupeAndSort(events: TaskReplayEvent[]) {
  const exact = new Set<string>();
  const merged = new Map<string, TaskReplayEvent & { merged_sources?: string[] }>();
  for (const item of events) {
    const exactKey = `${item.at}|${item.task_id}|${item.category}|${item.title}|${item.summary.slice(0, 160)}`;
    if (exact.has(exactKey)) continue;
    exact.add(exactKey);
    const key = mergeKey(item);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, item);
      continue;
    }
    const keep = sourceRank(item.source) < sourceRank(current.source) ? item : current;
    const drop = keep === item ? current : item;
    merged.set(key, {
      ...keep,
      evidence_ids: [...new Set([...keep.evidence_ids, ...drop.evidence_ids])],
      merged_sources: [...new Set([...(current.merged_sources || [current.source]), drop.source, keep.source])],
    });
  }
  return [...merged.values()]
    .map(item => item.merged_sources && item.merged_sources.length > 1
      ? { ...item, technical: { ...(item.technical || {}), merged_from: item.merged_sources.join("、"), merged_count: item.merged_sources.length } }
      : item)
    .sort((a, b) => a.at.localeCompare(b.at) || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.id.localeCompare(b.id));
}

export function paginateReplayEventsForView(allEvents: TaskReplayEvent[], options: TaskReplayEventPageOptions = {}) {
  const eventQuery = String(options.query || "").trim().toLowerCase();
  const hasEventViewOptions = Object.keys(options).length > 0;
  const filteredEvents = hasEventViewOptions ? allEvents.filter(item => {
    if (!options.includeSystemEvents && item.audience === "technical") return false;
    if (options.stage && options.stage !== "all" && item.stage !== options.stage) return false;
    if (options.status && options.status !== "all" && item.status !== options.status) return false;
    if (options.actor && options.actor !== "all" && item.actor?.type !== options.actor) return false;
    if (options.task && options.task !== "all" && item.task_id !== options.task) return false;
    const haystack = `${item.title} ${item.summary} ${item.actor?.label} ${item.project} ${item.category}`.toLowerCase();
    if (eventQuery && !haystack.includes(eventQuery)) return false;
    if (options.preset === "issues" && !["failed", "blocked", "warning"].includes(item.status)) return false;
    if (options.preset === "test" && !(item.actor?.type === "test_agent" || item.stage === "test")) return false;
    if (options.preset === "browser" && !/browser|playwright|screenshot|页面|浏览器/i.test(haystack)) return false;
    if (options.preset === "changes" && !["change", "execution", "rework"].includes(item.stage)) return false;
    return true;
  }) : allEvents;
  const requestedLimit = Number(options.eventLimit || 0);
  const paginated = Number.isFinite(requestedLimit) && requestedLimit > 0;
  const eventLimit = paginated ? Math.max(1, Math.min(500, Math.floor(requestedLimit))) : filteredEvents.length;
  const afterAt = iso(options.afterEventAt || "");
  const afterId = String(options.afterEventId || "");
  const requestedOffset = Number(options.eventOffset || 0);
  let eventOffset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0;
  let mode = "full";
  if (paginated && afterAt) {
    const firstNewIndex = filteredEvents.findIndex(item => item.at > afterAt || (item.at === afterAt && item.id > afterId));
    eventOffset = firstNewIndex < 0 ? filteredEvents.length : firstNewIndex;
    mode = "incremental";
  } else if (paginated && options.eventTail) {
    eventOffset = Math.max(0, filteredEvents.length - eventLimit);
    mode = "tail";
  } else if (paginated) {
    mode = "page";
  }
  eventOffset = Math.min(eventOffset, filteredEvents.length);
  const events = paginated ? filteredEvents.slice(eventOffset, eventOffset + eventLimit) : filteredEvents;
  const nextOffset = eventOffset + events.length;
  return {
    events,
    eventPage: {
      mode,
      offset: eventOffset,
      limit: eventLimit,
      returned: events.length,
      total: filteredEvents.length,
      total_unfiltered: allEvents.length,
      has_previous: eventOffset > 0,
      has_more: nextOffset < filteredEvents.length,
      previous_offset: Math.max(0, eventOffset - eventLimit),
      next_offset: nextOffset,
      first_cursor: events[0] ? { at: events[0].at, id: events[0].id } : null,
      last_cursor: events.at(-1) ? { at: events.at(-1)!.at, id: events.at(-1)!.id } : null,
    },
  };
}

function taskPublicRow(task: any, rootId: string) {
  const normalized = require("./collaboration-task-service").normalizeTaskTerminalStateView(task);
  return {
    id: String(normalized.id || ""),
    parent_task_id: String(normalized.parent_task_id || ""),
    root_task_id: rootId,
    title: taskLabel(normalized),
    goal: safeText(normalized.business_goal || normalized.description, 500),
    project: safeText(normalized.target_project, 100),
    group_id: String(normalized.group_id || ""),
    group_session_id: String(normalized.group_session_id || ""),
    project_session_id: String(normalized.project_session_id || ""),
    request_origin: String(normalized.request_origin || ""),
    schedule_origin: normalized.cron_job_id ? {
      cronJobId: String(normalized.cron_job_id || ""),
      cronRunId: String(normalized.cron_run_id || ""),
      occurrenceId: String(normalized.cron_occurrence_id || ""),
      scheduledFor: iso(normalized.cron_scheduled_for),
      trigger: String(normalized.cron_trigger || "schedule"),
    } : null,
    queue_scope: String(normalized.queue_scope || ""),
    queue_target_key: String(normalized.queue_target_key || ""),
    queue_position: Math.max(0, Number(normalized.queue_position || 0)),
    queue_state: String(normalized.queue_state || ""),
    scheduler_state: normalized.scheduler_state || null,
    workspace_lane: String(normalized.scheduler_state?.workspace_lane || normalized.workspace_lane || ""),
    trace_id: String(normalized.trace_id || ""),
    status: String(normalized.status || "pending"),
    acceptance_state: String(normalized.acceptance_state || "pending"),
    interruption_receipt: normalized.interruption_receipt || null,
    recovery_decision: normalized.recovery_decision || null,
    intake_identity_checksum: String(normalized.intake_identity_checksum || ""),
    terminal_state_receipt: normalized.terminal_state_receipt || null,
    terminal_decision: normalized.terminal_decision || null,
    terminal_gate: normalized.terminal_gate || null,
    legacy_status_unverified: normalized.legacy_status_unverified === true || (TERMINAL.has(String(normalized.status || "").toLowerCase()) && !normalized.terminal_decision),
    semantic_decision_receipt: normalized.semantic_decision_receipt || normalized.workflow_decision?.semantic_decision_receipt || null,
    route_decision: normalized.route_decision || null,
    created_at: iso(normalized.created_at),
    updated_at: iso(normalized.updated_at),
    is_root: String(normalized.id) === rootId,
  };
}

export function buildCompleteTaskReplay(taskId: string, options: TaskReplayEventPageOptions = {}) {
  const family = taskFamily(String(taskId || ""));
  if (!family) return null;
  const ids = [...family.ids];
  const globalRecords = relatedGlobalRecords(family.ids);
  const artifactRuns = listTestAgentArtifactCatalogForTasks(ids);
  const extraTraceIds = [...globalRecords.runs.map(run => run.trace_id), ...globalRecords.supervisors.map(record => record.trace_id)].filter(Boolean);
  const planData = buildPlanAndWorkItemData(family.tasks);
  const includeDetails = options.includeDetails !== false;
  const deliveries = includeDetails ? family.tasks.map((task: any) => buildTaskReplayDeliveryView(task)).filter(Boolean) : [];
  const mutableSources = replayMutableSourceIdentity(family, extraTraceIds);
  const sourceChecksum = replaySourceChecksum(family, globalRecords, artifactRuns, mutableSources);
  let allEvents = readMaterializedReplayEvents(String(family.root.id), sourceChecksum);
  const materializedCacheHit = !!allEvents;
  if (!allEvents) {
    allEvents = addReplayEventLinks(dedupeAndSort([
      ...buildTaskEvents(family.tasks),
      ...planData.events,
      ...buildMessageEvents(family.tasks),
      ...buildExecutionEvents(family.tasks),
      ...buildUserVisibleExecutionEvents(family.tasks),
      ...buildGlobalEvents(globalRecords, family.root),
      ...buildTestAgentEvents(ids, artifactRuns),
      ...buildJournalEvents(family.tasks),
      ...buildTraceEvents(family.tasks, extraTraceIds),
    ]), family.tasks);
    storeMaterializedReplayEvents(String(family.root.id), sourceChecksum, allEvents);
  }
  storeReplaySourceManifest(String(family.root.id), sourceChecksum, allEvents.length, mutableSources);
  const evidence = includeDetails ? taskEvidence(family.tasks, artifactRuns) : [];
  // 文件改动与验证命令的明细由证据面板唯一承载，工作单只留计数并挂上跳转用的 evidence_ids，避免同一批数据两处各列一遍。
  const evidenceByTaskProject = new Map<string, string>();
  for (const item of evidence) {
    if (!["code_changes", "verification"].includes(item.type)) continue;
    evidenceByTaskProject.set(`${item.task_id}|${item.type}|${String(item.project || "").toLowerCase()}`, item.id);
  }
  const workItems = includeDetails ? planData.workItems.map((row: any) => {
    const project = String(row.target || row.owner || "").toLowerCase();
    const ids = [
      evidenceByTaskProject.get(`${row.task_id}|code_changes|${project}`) || evidenceByTaskProject.get(`${row.task_id}|code_changes|`),
      evidenceByTaskProject.get(`${row.task_id}|verification|${project}`) || evidenceByTaskProject.get(`${row.task_id}|verification|`),
    ].filter(Boolean);
    return { ...row, verification_count: row.verification.length, evidence_ids: [...new Set(ids)] };
  }) : [];
  const issueEvents = allEvents.filter(item => ["failed", "blocked", "warning"].includes(item.status));
  const phases = STAGE_ORDER.map(stage => {
    const rows = allEvents.filter(item => item.stage === stage);
    const status: TaskReplayStatus = rows.some(item => item.status === "failed") ? "failed" : rows.some(item => item.status === "blocked") ? "blocked" : rows.some(item => item.status === "warning") ? "warning" : rows.some(item => item.status === "running") ? "running" : rows.length ? "passed" : "info";
    return { id: stage, status, event_count: rows.length, started_at: rows[0]?.at || "", finished_at: rows.at(-1)?.at || "" };
  }).filter(row => row.event_count > 0);
  const { events, eventPage } = paginateReplayEventsForView(allEvents, options);
  const normalizedRoot = require("./collaboration-task-service").normalizeTaskTerminalStateView(family.root);
  const rootStatus = String(normalizedRoot.status || "pending");
  const rootAcceptanceState = String(normalizedRoot.acceptance_state || "pending");
  const usageSources = [...family.tasks, ...globalRecords.runs];
  const recordedUsage = (source: any, keys: string[]) => {
    for (const key of keys) {
      const value = key.split(".").reduce((current: any, part: string) => current?.[part], source);
      if (value !== undefined && value !== null && Number.isFinite(Number(value))) return Math.max(0, Math.floor(Number(value)));
    }
    return null;
  };
  const sumRecordedUsage = (keys: string[]) => {
    const rows = usageSources.map((source: any) => recordedUsage(source, keys)).filter((value: any) => value !== null);
    return rows.length ? rows.reduce((sum: number, value: number) => sum + value, 0) : null;
  };
  const replayInputTokens = sumRecordedUsage(["input_tokens", "inputTokens", "usage.inputTokens", "usage.input_tokens"]);
  const replayOutputTokens = sumRecordedUsage(["output_tokens", "outputTokens", "usage.outputTokens", "usage.output_tokens"]);
  const replayModelCalls = sumRecordedUsage(["model_calls", "modelCalls", "usage.modelCalls", "usage.model_calls"]);
  const replayRetryCount = sumRecordedUsage(["retry_count", "retryCount", "provider_retry_count", "providerRetryCount"]);
  const replayTokenCount = replayInputTokens !== null || replayOutputTokens !== null
    ? Number(replayInputTokens || 0) + Number(replayOutputTokens || 0)
    : null;
  const startedAt = iso(family.root.started_at || family.root.created_at);
  const finishedAt = iso(family.root.completed_at || (TERMINAL.has(rootStatus.toLowerCase()) ? family.root.updated_at : ""));
  const presentation = buildTaskReplayPresentation({
    root: family.root,
    tasks: family.tasks,
    plans: planData.plans,
    workItems,
    deliveries,
    evidence,
    events: allEvents,
    status: rootStatus,
    acceptanceState: rootAcceptanceState,
    startedAt,
    finishedAt,
  });
  const conversationLinks = family.tasks.flatMap((task: any) => buildTaskConversationLinks(task)?.links || []);
  const navigation = [...new Map(conversationLinks.map((item: any) => [`${item.relation}|${item.scope}|${item.scopeId}|${item.exactSessionId}|${item.messageId || ""}`, item])).values()];
  const result: any = {
    schema: "ccm-complete-task-replay-v1",
    generated_at: new Date().toISOString(),
    replay_source_checksum: sourceChecksum,
    replay_event_index: { schema: "ccm-task-replay-event-index-v2", materialized: true, cache_hit: materializedCacheHit, event_count: allEvents.length },
    selected_task_id: String(family.selected.id),
    root_task_id: String(family.root.id),
    title: taskLabel(family.root),
    goal: safeText(family.root.business_goal || family.root.description, 700),
    status: rootStatus,
    acceptance_state: rootAcceptanceState,
    interruption_receipt: normalizedRoot.interruption_receipt || null,
    recovery_decision: normalizedRoot.recovery_decision || null,
    acceptance_decision: normalizedRoot.acceptance_decision || normalizedRoot.epic_acceptance_decision || null,
    terminal_state_receipt: normalizedRoot.terminal_state_receipt || null,
    terminal_decision: normalizedRoot.terminal_decision || null,
    terminal_gate: normalizedRoot.terminal_gate || null,
    scheduler_state: normalizedRoot.scheduler_state || null,
    schedule_origin: normalizedRoot.cron_job_id ? {
      cronJobId: String(normalizedRoot.cron_job_id || ""),
      cronRunId: String(normalizedRoot.cron_run_id || ""),
      occurrenceId: String(normalizedRoot.cron_occurrence_id || ""),
      scheduledFor: iso(normalizedRoot.cron_scheduled_for),
      trigger: String(normalizedRoot.cron_trigger || "schedule"),
    } : null,
    completed: TERMINAL.has(rootStatus.toLowerCase()),
    started_at: startedAt,
    finished_at: finishedAt,
    tasks: family.tasks.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""))).map(task => taskPublicRow(task, String(family.root.id))),
    actors: [
      { id: "global_agent", label: "全局主 Agent", present: globalRecords.runs.length > 0 },
      { id: "group_agent", label: "群聊主 Agent", present: family.tasks.some(task => !!task.group_id) },
      { id: "project_agent", label: "项目子 Agent", present: family.tasks.some(task => listExecutions({ taskId: task.id }).length > 0) },
      { id: "test_agent", label: "TestAgent", present: artifactRuns.length > 0 || listTestAgentRunnerRecords({ taskIds: ids, limit: 1 }).length > 0 },
    ],
    summary: { event_count: allEvents.length, issue_count: issueEvents.length, failed_count: issueEvents.filter(item => item.status === "failed").length, task_count: family.tasks.length, evidence_count: evidence.length, test_run_count: artifactRuns.length, plan_count: planData.plans.length, work_item_count: workItems.length, user_event_count: allEvents.filter(item => item.audience === "user").length, technical_event_count: allEvents.filter(item => item.audience === "technical").length, delivery_count: deliveries.length, model_call_count: replayModelCalls, provider_retry_count: replayRetryCount, input_token_count: replayInputTokens, output_token_count: replayOutputTokens, token_count: replayTokenCount },
    phases,
    presentation,
    navigation,
    events,
    event_page: eventPage,
    retention: {
      task_record: { status: "available", policy: "任务删除前保留" },
      trace: { status: "available", policy: "完整任务日志保留到任务删除；快速 Trace 保留最近 1200 条" },
      test_agent: { status: artifactRuns.some(run => run.retention_status === "available") ? "available" : artifactRuns.length ? "expired" : "not_created", policy: "默认保留 14 天，且受 200 次运行和 2GB 上限约束", earliest_expiry: artifactRuns.map(run => run.retained_until).filter(Boolean).sort()[0] || "" },
    },
    replay_capabilities: {
      chronological: true,
      filters: ["stage", "status", "actor", "task", "search"],
      event_pagination: true,
      materialized_event_index: true,
      incremental_cursor: true,
      failure_navigation: true,
      evidence_preview: true,
      historical_line_diff: true,
      plan_visibility: true,
      work_item_visibility: true,
      delivery_visibility: true,
      duplicate_event_merging: true,
      user_readable_v5: true,
      integrity_gaps: true,
      causal_chain: true,
      attempt_comparison: true,
      action_center: true,
      freshness_check: true,
      user_report: true,
      audit_json: true,
      precise_event_links: true,
      virtualized_timeline: true,
      acceptance_matrix: true,
      issue_resolution: true,
      attempt_history: true,
      conversation_navigation: true,
      raw_machine_paths_exposed: false,
    },
  };
  if (includeDetails) Object.assign(result, { plans: planData.plans, work_items: workItems, deliveries, evidence });
  return result;
}

function projectWorkDir(project: string) {
  const config = getConfigs().find(item => String(item.name || "").toLowerCase() === String(project || "").toLowerCase());
  if (!config) return "";
  try { return String(getConfigInfo(config.path)?.[0]?.workDir || ""); } catch { return ""; }
}

function taskDeclaredFiles(task: any) {
  const summary = task?.delivery_summary || {};
  return [...new Set([
    ...replayChangeRows(summary.actual_file_changes),
    ...replayChangeRows(summary.files_changed),
    ...replayChangeRows(summary.file_changes),
    ...replayChangeRows(task?.file_changes),
  ].map(publicFile).filter(Boolean))].slice(0, 500);
}

export function buildTaskReplayFreshness(taskId: string) {
  const family = taskFamily(String(taskId || ""));
  if (!family) return null;
  const projects = new Map<string, any>();
  const evidenceRows = family.tasks.flatMap((task: any) => listEvidence({ taskId: String(task.id || "") }));
  for (const task of family.tasks) {
    const project = String(task.target_project || "");
    if (!project) continue;
    const files = taskDeclaredFiles(task);
    const workDir = projectWorkDir(project);
    if (!workDir) {
      projects.set(project, { project, freshness: "unavailable", reason: "项目路径不可用", files: files.map(file => ({ path: file, freshness: "unavailable" })) });
      continue;
    }
    let current: any = null;
    try { current = captureRepoStateIdentity(workDir, files); } catch {}
    const taskEvidenceRows = evidenceRows.filter(row => row.taskId === String(task.id || "") && row.repoStateIdentity);
    const states = taskEvidenceRows.map(row => compareRepoStateIdentity(row.repoStateIdentity, current));
    const repoFreshness = !current ? "unavailable" : states.includes("stale") ? "drifted" : states.length && states.every(state => state === "valid") ? "current" : "unknown";
    const fileRows = files.map(file => {
      const absolute = path.resolve(workDir, file);
      const contained = absolute === path.resolve(workDir) || absolute.startsWith(`${path.resolve(workDir)}${path.sep}`);
      if (!contained) return { path: file, freshness: "permission_revoked" };
      try { return { path: file, freshness: fs.statSync(absolute).isFile() ? repoFreshness : "deleted" }; }
      catch (error: any) { return { path: file, freshness: error?.code === "EACCES" ? "permission_revoked" : "deleted" }; }
    });
    projects.set(project, {
      project,
      freshness: fileRows.some(row => row.freshness === "permission_revoked") ? "permission_revoked" : fileRows.some(row => row.freshness === "deleted") ? "deleted" : repoFreshness,
      authoritativeRevision: current ? repoStateFingerprint(current) : "",
      files: fileRows,
    });
  }
  const evidence = evidenceRows.map(row => {
    const project = family.tasks.find((task: any) => String(task.id || "") === row.taskId)?.target_project || "";
    const currentProject = projects.get(String(project));
    let freshness = row.status === "invalid" ? "drifted" : row.status === "stale" ? "drifted" : row.status === "unknown" ? "unknown" : "current";
    if (currentProject?.freshness && currentProject.freshness !== "current") freshness = currentProject.freshness;
    return { evidenceId: row.evidenceId, type: row.evidenceType, freshness, expiresAt: row.expiresAt || "", sourceChecksum: row.sourceChecksum };
  });
  return { schema: "ccm-task-replay-freshness-v1", taskId: String(family.root.id || taskId), checkedAt: new Date().toISOString(), projects: [...projects.values()], evidence, contentStored: false };
}

function safeAuditEvidence(item: any) {
  return {
    id: String(item?.id || ""), type: String(item?.type || ""), title: safeText(item?.title, 300), task_id: String(item?.task_id || ""), project: safeText(item?.project, 100),
    status: String(item?.status || ""), retained_until: safeText(item?.retained_until, 80), item_count: Math.max(0, Number(item?.file_count || item?.items?.length || 0)), contentStored: false,
  };
}

function safeAuditTechnical(value: any, depth = 0): any {
  if (depth > 5 || value == null) return value == null ? value : "[详情已收起]";
  if (Array.isArray(value)) return value.slice(0, 80).map(item => safeAuditTechnical(item, depth + 1));
  if (typeof value === "string") return safeText(value, 800);
  if (typeof value !== "object") return value;
  const output: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/(prompt|thinking|reasoning|stdout|stderr|raw.?output|source.?code|diff|patch|body|native.?session|lease.?id|work.?dir|file.?path)/i.test(key)) continue;
    output[key] = safeAuditTechnical(item, depth + 1);
  }
  return output;
}

export function buildTaskReplayUserReport(taskId: string) {
  const replay: any = buildCompleteTaskReplay(taskId, { eventTail: false, eventOffset: 0, eventLimit: 1, includeDetails: true });
  if (!replay) return null;
  return {
    schema: "ccm-task-replay-user-report-v1",
    generatedAt: new Date().toISOString(),
    taskId: replay.root_task_id,
    title: replay.title,
    goal: replay.goal,
    status: replay.status,
    result: replay.presentation?.outcome || null,
    integrity: replay.presentation?.integrity || null,
    requirementsAndDelivery: (replay.deliveries || []).map((row: any) => ({ businessGoal: row.business_goal, acceptanceCriteria: row.acceptance_criteria, finalReport: row.final_report || row.user_report || row.headline, verification: row.verification, risks: row.blockers, unfinished: row.needs })),
    plan: (replay.plans || []).map((row: any) => ({ title: row.title, status: row.status, steps: (row.steps || []).map((step: any) => ({ title: step.title, detail: step.detail, status: step.status })) })),
    attempts: (replay.presentation?.attemptComparisons || []).map((group: any) => ({ project: group.project, attempts: (group.attempts || []).map((row: any) => ({ attempt: row.attempt, status: row.status, accepted: row.accepted, superseded: row.superseded, summary: row.summary, failureReason: row.failureReason, filesChanged: row.filesChanged, verificationCount: row.verificationCount })) })),
    acceptance: (replay.presentation?.acceptanceMatrix || []).map((row: any) => ({ description: row.description, status: row.status, verifier: row.verifier, freshness: row.freshness, reason: row.reason })),
    fileStatistics: (replay.evidence || []).filter((item: any) => item.type === "code_changes").map((item: any) => ({ project: item.project, fileCount: item.file_count, additions: (item.files || []).reduce((sum: number, file: any) => sum + Number(file.additions || 0), 0), deletions: (item.files || []).reduce((sum: number, file: any) => sum + Number(file.deletions || 0), 0) })),
    contentStored: false,
  };
}

export function buildTaskReplayAuditExport(taskId: string) {
  const replay: any = buildCompleteTaskReplay(taskId, { includeDetails: true, includeSystemEvents: true });
  if (!replay) return null;
  return {
    schema: "ccm-task-replay-audit-export-v1",
    generatedAt: new Date().toISOString(),
    taskId: replay.root_task_id,
    sourceChecksum: replay.replay_source_checksum,
    status: replay.status,
    acceptanceState: replay.acceptance_state,
    integrity: replay.presentation?.integrity || null,
    attempts: replay.presentation?.attemptComparisons || [],
    actionCenter: replay.presentation?.actionCenter || [],
    tasks: replay.tasks,
    events: (replay.events || []).map((row: any) => ({ ...row, summary: safeText(row.summary, 1200), technical: safeAuditTechnical(row.technical) })),
    evidence: (replay.evidence || []).map(safeAuditEvidence),
    retention: replay.retention,
    contentStored: false,
  };
}

export function projectTaskReplayForAccess(replay: any, canManage: boolean) {
  if (!replay || canManage) return replay;
  const cleanEvent = (row: any) => {
    const { technical, ...safe } = row || {};
    return safe;
  };
  const {
    replay_source_checksum: _sourceChecksum,
    terminal_state_receipt: _terminalReceipt,
    terminal_decision: _terminalDecision,
    terminal_gate: _terminalGate,
    scheduler_state: _schedulerState,
    ...businessReplay
  } = replay;
  const cleanTask = (task: any) => {
    const { trace_id, queue_target_key, scheduler_state, intake_identity_checksum, terminal_state_receipt, terminal_decision, terminal_gate, semantic_decision_receipt, route_decision, ...safe } = task || {};
    return safe;
  };
  const cleanEvidence = (item: any) => ({
    ...item,
    files: Array.isArray(item?.files) ? item.files.map((file: any) => {
      const { diff, ...safeFile } = file || {};
      return safeFile;
    }) : item?.files,
    diff_available_count: undefined,
    diff_unavailable_count: undefined,
  });
  return {
    ...businessReplay,
    tasks: (replay.tasks || []).map(cleanTask),
    events: (replay.events || []).filter((row: any) => row.audience !== "technical").map(cleanEvent),
    evidence: (replay.evidence || []).map(cleanEvidence),
    summary: { ...(replay.summary || {}), technical_event_count: 0 },
    presentation: replay.presentation ? {
      ...replay.presentation,
      actionCenter: (replay.presentation.actionCenter || []).filter((row: any) => row.kind === "view_error").map(({ bindingChecksum, ...row }: any) => row),
    } : null,
    replay_capabilities: { ...(replay.replay_capabilities || {}), technical_events: false, audit_json: false },
  };
}

export function buildTaskReplayIndex(input: number | TaskReplayIndexOptions = 40) {
  return buildTaskReplayIndexFromRecords(loadTasks(), loadGroups(), input);
}

function replayIndexStage(task: any, members: any[]) {
  const explicit = safeText(task.current_stage || task.execution_stage || task.workflow_stage || task.phase, 80).toLowerCase();
  const explicitLabels: Record<string, string> = {
    planning: "正在制定计划", preparation: "准备与检索", dispatch: "正在分派",
    execution: "项目 Agent 执行", project_execution: "项目 Agent 执行",
    test: "独立验收", verification: "独立验收", independent_verification: "独立验收",
    rework: "返工与复验", review: "主 Agent 验收", summary: "主 Agent 总结",
    completion: "最终交付",
  };
  if (explicit && explicitLabels[explicit]) return { id: explicit, label: explicitLabels[explicit] };
  const statuses = members.map((item: any) => String(item.status || "").toLowerCase());
  const acceptance = String(task.acceptance_state || "").toLowerCase();
  if (statuses.some(status => ["failed", "blocked", "recovery_required"].includes(status))) return { id: "attention", label: "需要处理" };
  if (["done", "completed", "accepted"].includes(String(task.status || "").toLowerCase()) || acceptance === "accepted") return { id: "completion", label: "已完成" };
  if (statuses.some(status => ["in_progress", "running", "executing", "verifying"].includes(status))) return { id: "execution", label: "执行中" };
  if (statuses.some(status => ["queued", "pending", "created"].includes(status))) return { id: "queued", label: "排队等待" };
  return { id: "unknown", label: "等待更新" };
}

function replayIndexUnresolvedCount(task: any, members: any[]) {
  const rows = new Set<string>();
  const append = (value: any) => {
    if (!Array.isArray(value)) return;
    value.forEach((item: any, index: number) => rows.add(safeText(item?.id || item?.code || item?.title || item?.summary || item, 200) || `item-${index}`));
  };
  append(task?.blockers);
  append(task?.delivery_summary?.blockers);
  append(task?.delivery_summary?.unresolved_items);
  for (const member of members) {
    const status = String(member?.status || "").toLowerCase();
    if (["failed", "blocked", "recovery_required"].includes(status)) rows.add(`task:${String(member?.id || status)}`);
  }
  return rows.size;
}

export function buildTaskReplayIndexFromRecords(tasks: any[], groups: any[], input: number | TaskReplayIndexOptions = 40) {
  const byId = new Map(tasks.map((task: any) => [String(task.id), task]));
  const options: TaskReplayIndexOptions = typeof input === "number" ? { limit: input } : (input || {});
  const requestedIndexLimit = Number(options.limit || 40);
  const requestedIndexPage = Number(options.page || 1);
  const limit = Number.isFinite(requestedIndexLimit) ? Math.max(1, Math.min(100, Math.floor(requestedIndexLimit))) : 40;
  const page = Number.isFinite(requestedIndexPage) ? Math.max(1, Math.floor(requestedIndexPage)) : 1;
  const query = String(options.query || "").trim().toLowerCase();
  const projectFilter = String(options.project || "").trim().toLowerCase();
  const groupFilter = String(options.groupId || "").trim();
  const statusFilter = String(options.status || "").trim().toLowerCase();
  const fromMs = Date.parse(String(options.dateFrom || ""));
  const toMs = Date.parse(String(options.dateTo || ""));
  const groupById = new Map(groups.map((group: any) => [String(group.id || ""), String(group.name || group.id || "")]));
  const rootIdFor = (task: any) => {
    let current = task;
    const seen = new Set<string>();
    while (current?.parent_task_id && byId.has(String(current.parent_task_id)) && !seen.has(String(current.parent_task_id))) {
      seen.add(String(current.id || ""));
      current = byId.get(String(current.parent_task_id));
    }
    return String(current?.id || task?.id || "");
  };
  const membersByRoot = new Map<string, any[]>();
  for (const task of tasks) {
    const rootId = rootIdFor(task);
    if (!membersByRoot.has(rootId)) membersByRoot.set(rootId, []);
    membersByRoot.get(rootId)!.push(task);
  }
  const roots = tasks.filter((task: any) => rootIdFor(task) === String(task.id || ""))
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
  const rows = roots.map((task: any) => {
    const members = membersByRoot.get(String(task.id)) || [task];
    const projects = [...new Set(members.map((item: any) => safeText(item.target_project, 100)).filter(Boolean))].sort();
    const groupIds = [...new Set(members.map((item: any) => String(item.group_id || "")).filter(Boolean))];
    const primaryGroupId = String(task.group_id || groupIds[0] || "");
    const groupName = groupById.get(primaryGroupId) || safeText(task.workflow_meta?.group_name, 100) || primaryGroupId;
    const currentStage = replayIndexStage(task, members);
    return {
      ...taskPublicRow(task, String(task.id)),
      projects,
      group_name: groupName,
      child_count: Math.max(0, members.length - 1),
      current_stage: currentStage.id,
      current_stage_label: currentStage.label,
      unresolved_issue_count: replayIndexUnresolvedCount(task, members),
      replay_url: `/api/tasks/replay?task_id=${encodeURIComponent(task.id)}`,
      _group_ids: groupIds,
    };
  });
  const facetCount = (values: string[], matches: (row: any, value: string) => boolean) => [...new Set(values.filter(Boolean))].map(value => ({
    value,
    label: value,
    count: rows.filter((row: any) => matches(row, value)).length,
  }));
  const filtered = rows.filter((row: any) => {
    const updatedMs = Date.parse(row.updated_at || row.created_at || "");
    if (projectFilter && !row.projects.some((value: string) => value.toLowerCase() === projectFilter)) return false;
    if (groupFilter && !row._group_ids.includes(groupFilter)) return false;
    if (statusFilter && String(row.status).toLowerCase() !== statusFilter) return false;
    if (Number.isFinite(fromMs) && (!Number.isFinite(updatedMs) || updatedMs < fromMs)) return false;
    if (Number.isFinite(toMs) && (!Number.isFinite(updatedMs) || updatedMs > toMs)) return false;
    if (query) {
      const haystack = `${row.title} ${row.goal} ${row.id} ${row.projects.join(" ")} ${row.group_name}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  const offset = (page - 1) * limit;
  const projectValues = rows.flatMap((row: any) => row.projects || []);
  const statusValues = rows.map((row: any) => String(row.status || "")).filter(Boolean);
  const groupFacets = groups.map((group: any) => ({ value: String(group.id || ""), label: String(group.name || group.id || ""), count: rows.filter((row: any) => row._group_ids.includes(String(group.id || ""))).length })).filter((item: any) => item.value && item.count > 0);
  return {
    schema: "ccm-task-replay-index-v1",
    generated_at: new Date().toISOString(),
    total: filtered.length,
    total_all: rows.length,
    page,
    page_size: limit,
    page_count: Math.max(1, Math.ceil(filtered.length / limit)),
    has_previous: page > 1,
    has_more: offset + limit < filtered.length,
    filters: { query: options.query || "", project: options.project || "", group_id: options.groupId || "", status: options.status || "", date_from: options.dateFrom || "", date_to: options.dateTo || "" },
    facets: {
      projects: facetCount(projectValues, (row, value) => row.projects?.includes(value)).sort((a, b) => a.label.localeCompare(b.label)),
      groups: groupFacets,
      statuses: facetCount(statusValues, (row, value) => row.status === value),
    },
    tasks: filtered.slice(offset, offset + limit).map(({ _group_ids, ...row }: any) => row),
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
  const planSelfTest = runTaskReplayPlanSelfTest();
  const deliverySelfTest = runTaskReplayDeliverySelfTest();
  const presentationSelfTest = runTaskReplayPresentationSelfTest();
  const mergeSample = dedupeAndSort([
    event({ id: "m1", at: "2026-07-20T01:00:05.000Z", task_id: "t", status: "passed", title: "计划版本 v0 · 待证明 4 项", summary: "计划版本 v0 · 待证明 4 项", source: "journal" }),
    event({ id: "m2", at: "2026-07-20T01:00:40.000Z", task_id: "t", status: "passed", title: "我已复核目标与验收", summary: "计划版本 v0 · 待证明 4 项", source: "timeline" }),
    event({ id: "m3", at: "2026-07-20T01:00:50.000Z", task_id: "t", status: "passed", title: "另一件事", summary: "子 Agent 已提交结果说明", source: "timeline" }),
  ]);
  const gateSummary = timelineSummary({
    detail: "2 项未通过",
    data: { failed_checks: [
      { id: "verification", label: "已执行验证", ok: false, detail: "已执行 0 条" },
      { label: "真实文件变更", ok: false, detail: "变更 0 个文件" },
    ] },
  });
  const linkedEvent = addReplayEventLinks([event({ id: "linked", title: "项目 Agent 执行", task_id: "task-linked", evidence_ids: ["ev-1"], technical: { work_item_id: "work-1", attempt: 2 } })], [{ id: "task-linked", target_project: "web", project_session_id: "session-1", anchor_message_id: "message-1", generation: 4 }])[0];
  const businessProjection = projectTaskReplayForAccess({
    replay_source_checksum: "internal", terminal_gate: { checksum: "gate" },
    tasks: [{ id: "task-linked", trace_id: "trace", terminal_state_receipt: { checksum: "receipt" } }],
    events: [{ id: "user", audience: "user", technical: { lease_id: "lease" } }, { id: "tech", audience: "technical" }],
    evidence: [{ id: "ev", files: [{ path: "src/a.ts", diff: { diff: "SOURCE_SENTINEL" } }] }],
    summary: { technical_event_count: 1 }, presentation: { actionCenter: [{ kind: "retry", bindingChecksum: "binding" }, { kind: "view_error", bindingChecksum: "binding" }] }, replay_capabilities: {},
  }, false);
  const businessSerialized = JSON.stringify(businessProjection);
  const checks = {
    secrets_redacted: secret.includes("[已隐藏]"),
    paths_redacted: secret.includes("[本机路径]"),
    status_normalized: normalizeStatus("failed") === "failed",
    browser_stage: inferStage("test_agent_runner", "test_run") === "test",
    complete_journal: journal.pass,
    historical_line_diff_preserved: change?.diff?.available === true && change.diff.diff.includes("@@ -4,1 +4,1 @@"),
    missing_historical_diff_explained: unavailableChange?.diff?.available === false && /无法还原逐行代码内容/.test(unavailableChange.diff.reason),
    plan_and_work_items_visible: planSelfTest.pass,
    acceptance_gate_failures_detailed: gateSummary.includes("已执行验证（已执行 0 条）") && gateSummary.includes("真实文件变更（变更 0 个文件）"),
    // 用户看得懂的执行进展默认可见，只有机器标识才收进底层开关。
    readable_execution_event_visible: eventAudience({ source: "execution", status: "info", title: "web 正在修改登录状态恢复逻辑", summary: "读取会话存储与路由守卫" }) === "user",
    machine_trace_event_hidden: eventAudience({ source: "trace", status: "info", title: "agent.run", summary: "" }) === "technical",
    problem_event_always_visible: eventAudience({ source: "trace", status: "failed", title: "agent.run", summary: "" }) === "user",
    narrative_event_always_visible: eventAudience({ source: "task", status: "info", title: "任务已创建", summary: "" }) === "user",
    execution_state_readable: executionStateText("running") === "正在执行" && executionStateText("done") === "已完成执行" && executionStateText("weird-state") === "",
    delivery_anchors_visible: deliverySelfTest.pass,
    user_readable_v5: presentationSelfTest.pass,
    // journal 与 timeline 记录的同一件事被归并成一条，并保留来源痕迹；无关事件不受影响。
    duplicate_events_merged: mergeSample.length === 2
      && mergeSample.some(item => item.source === "timeline" && item.title === "我已复核目标与验收" && String(item.technical?.merged_from || "").includes("journal"))
      && mergeSample.some(item => item.title === "另一件事"),
    // 摘要与标题完全相同的事件不再渲染两遍。
    redundant_summary_dropped: event({ title: "任务执行租约已获取", summary: "任务执行租约已获取", source: "journal" }).summary === "",
    replay_event_linked: linkedEvent.replay_link?.schema === "ccm-task-event-link-v1" && linkedEvent.replay_link.anchorMessageId === "message-1" && linkedEvent.causal_refs?.workItemId === "work-1",
    business_projection_hides_technical: !businessSerialized.includes("SOURCE_SENTINEL") && !businessSerialized.includes("terminal_state_receipt") && !businessSerialized.includes("lease_id") && !businessSerialized.includes("bindingChecksum") && businessProjection.events.length === 1,
  };
  return {
    schema: "ccm-task-replay-contract-selftest-v1",
    pass: Object.values(checks).every(Boolean),
    checks,
    plan_checks: planSelfTest.checks,
    delivery_checks: deliverySelfTest.checks,
    presentation_checks: presentationSelfTest.checks,
  };
}
