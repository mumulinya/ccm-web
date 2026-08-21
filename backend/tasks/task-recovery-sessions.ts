import { getTaskById, loadTasks, updateTaskByIdCas } from "../core/db";
import * as fs from "fs";
import { createProjectSessionRecord, getSessionDetail, getSessionFilePath } from "../modules/projects/sessions";
import { createGroupChatSession, deleteGroupChatSession, listGroupChatSessions } from "../modules/collaboration/storage";
import { createGlobalAgentConversationSession, deleteGlobalAgentConversationSession, loadGlobalAgentHistoryStore } from "../modules/global/global-agent";
import { buildTaskContextCapsule, createTaskSessionBinding, type CcmTaskContextCapsuleV1, type CcmTaskScope } from "./task-context";

const WRITE_STATUSES = new Set(["pending", "queued", "in_progress", "running", "reviewing", "executing", "recovery_validating"]);
const text = (value: unknown, max = 400) => String(value ?? "").trim().slice(0, max);
const scopeOf = (task: any): CcmTaskScope => text(task?.source_channel || task?.request_origin, 40).toLowerCase().includes("feishu") ? "feishu" : text(task?.group_id) ? "group" : text(task?.target_project || task?.project_session_id) ? "project" : "global";
const scopeIdOf = (task: any, scope: CcmTaskScope) => scope === "group" ? text(task?.group_id) : scope === "project" ? text(task?.target_project) : scope === "feishu" ? text(task?.target_id || task?.source_conversation_ref?.scopeId || "global") : "global";
const sourceSessionOf = (task: any) => text(task?.exact_session_id || task?.group_session_id || task?.project_session_id || task?.origin_session_id || task?.source_conversation_ref?.exactSessionId);
const activeSessionOf = (task: any) => text(task?.execution_session_id || task?.active_execution_session_id || [...(Array.isArray(task?.task_context?.sessionBindings) ? task.task_context.sessionBindings : [])].reverse().find((item: any) => item?.status === "active" && item?.role !== "source")?.exactSessionId || sourceSessionOf(task));

function isBusy(task: any, currentTaskId: string) {
  return String(task?.id || "") !== currentTaskId && WRITE_STATUSES.has(String(task?.status || "").toLowerCase()) && task?.requires_code_changes !== false;
}

function appendBinding(taskId: string, binding: any, expectedContextChecksum = "") {
  const result = updateTaskByIdCas(taskId, current => !expectedContextChecksum || String(current?.task_context?.checksum || "") === expectedContextChecksum, current => {
    const context: CcmTaskContextCapsuleV1 = current?.task_context || buildTaskContextCapsule(current);
    const bindings = [...(Array.isArray(context.sessionBindings) ? context.sessionBindings : []).filter(item => item.bindingChecksum !== binding.bindingChecksum), binding];
    const next = { ...context, sessionBindings: bindings, revision: Number(context.revision || 0) + 1, updatedAt: new Date().toISOString() } as any;
    delete next.checksum;
    next.checksum = require("crypto").createHash("sha256").update(JSON.stringify(next)).digest("hex");
    return { ...current, task_context: next, task_context_revision_receipt: { revision: next.revision, checksum: next.checksum, reason: "session_binding", at: next.updatedAt, contentStored: false } };
  });
  return result.updated ? result.task : null;
}

function findBusy(task: any, sessionId: string) {
  return loadTasks().find(item => String(item?.execution_session_id || item?.active_execution_session_id || item?.exact_session_id || item?.group_session_id || item?.project_session_id || item?.origin_session_id || "") === sessionId && isBusy(item, String(task?.id || "")));
}

export function resolveTaskUserSession(taskInput: any, options: { attempt?: number; forceRecoverySession?: boolean; expectedContextChecksum?: string } = {}) {
  const task = getTaskById(text(taskInput?.id)) || taskInput;
  if (!task) throw new Error("任务不存在，无法恢复会话");
  const taskId = text(task.id); const scope = scopeOf(task); const scopeId = scopeIdOf(task, scope); const sourceSession = sourceSessionOf(task); const original = activeSessionOf(task); const attempt = Math.max(1, Number(options.attempt || task.execution_attempt || task.attempt || 0) + 1);
  let available = false; let archived = false; let originalSession: any = null;
  try {
    if (scope === "project") { originalSession = original ? getSessionDetail(scopeId, original) : null; available = !!originalSession; archived = originalSession?.archived === true || originalSession?.readOnly === true; }
    else if (scope === "group") { const row = listGroupChatSessions(scopeId).sessions.find((x: any) => String(x.id) === original); originalSession = row || null; available = !!row; archived = row?.archived === true; }
    else if (scope === "global" || scope === "feishu") { const store = loadGlobalAgentHistoryStore(); originalSession = (store.sessions || []).find((x: any) => String(x.id) === original) || null; available = !!originalSession; archived = originalSession?.archived === true || originalSession?.readOnly === true; }
  } catch { available = false; }
  const busy = original ? findBusy(task, original) : null;
  const canReuse = !options.forceRecoverySession && available && !archived && !busy;
  let activeSessionId = original; let mode: "original_reused" | "recovery_session_created" | "rejected" = "rejected"; let reason: any = "permission_changed";
  let created = false;
  if (canReuse) { mode = "original_reused"; reason = "original_reused"; }
  else {
    reason = !available ? "original_missing" : archived ? "original_archived" : busy ? "session_busy" : "permission_changed";
    const title = `恢复任务 · ${text(task.title || task.business_goal || "未命名任务", 55)} · 第 ${attempt} 次执行`;
    try {
      if (scope === "project") activeSessionId = String(createProjectSessionRecord(scopeId, title, "web", { sessionKind: "automation" }).sessionId || "");
      else if (scope === "group") activeSessionId = String(createGroupChatSession(scopeId, title, { sessionKind: "automation" }).id || "");
      else activeSessionId = String(createGlobalAgentConversationSession({ source: scope === "feishu" ? "feishu" : "web", name: title }).id || "");
      created = !!activeSessionId; mode = created ? "recovery_session_created" : "rejected";
    } catch (error: any) { return { mode: "rejected", originalSessionId: original || undefined, activeSessionId: undefined, reason, error: text(error?.message || error), created: false }; }
  }
  if (!activeSessionId) return { mode: "rejected", originalSessionId: original || undefined, reason, created: false };
  const context = task.task_context || buildTaskContextCapsule(task);
  const binding = createTaskSessionBinding({ task, taskId, attempt, role: created ? "recovery" : "active_execution", scope, scopeId, exactSessionId: activeSessionId, originalSessionId: sourceSession || original || undefined, createdForRecovery: created, reason, revision: Number(context.revision || 0) });
  const updated = appendBinding(taskId, binding, options.expectedContextChecksum || "");
  if (!updated) return { mode: "rejected", originalSessionId: original || undefined, reason: "permission_changed", created: false, error: "任务上下文已变化，请重新恢复" };
  return { mode, originalSessionId: original || undefined, activeSessionId, created, reason, binding, task: updated };
}

export function resolveTaskAgentSessionProjection(task: any, workItem: any, attempt: number, mode: "native_session" | "rehydrated_session" | "new_session" | "rejected" = "rehydrated_session") {
  const taskContext = task?.task_context || buildTaskContextCapsule(task);
  const previous = Array.isArray(workItem?.agent_session_ids) ? workItem.agent_session_ids.at(-1) : workItem?.agent_session_id;
  const raw = { taskId: text(task?.id), workItemId: text(workItem?.id || workItem?.workItemId), attempt: Math.max(1, Number(attempt || 1)), mode, ...(previous ? { previousAgentSessionId: text(previous) } : {}), provider: text(workItem?.provider || task?.provider || ""), project: text(workItem?.target || workItem?.project || task?.target_project), taskContextChecksum: text(taskContext.checksum, 160), workItemChecksum: require("crypto").createHash("sha256").update(JSON.stringify(workItem || {})).digest("hex"), workspaceManifestChecksum: text(taskContext.workspace?.manifestChecksum, 160), blockers: [], contentStored: false as const };
  return { ...raw, checksum: require("crypto").createHash("sha256").update(JSON.stringify(raw)).digest("hex") };
}

export function purgeTaskRecoveryUserSessions(task: any) {
  const bindings = Array.isArray(task?.task_context?.sessionBindings) ? task.task_context.sessionBindings : [];
  const removed: any[] = [];
  for (const binding of bindings) {
    if (binding?.createdForRecovery !== true || !binding?.exactSessionId) continue;
    try {
      if (binding.scope === "group") {
        const result = deleteGroupChatSession(String(binding.scopeId), String(binding.exactSessionId), { reason: "永久删除任务恢复会话" });
        if ((result as any)?.deleted || (result as any)?.session) removed.push({ scope: binding.scope, sessionId: binding.exactSessionId });
      } else if (binding.scope === "global" || binding.scope === "feishu") {
        const result = deleteGlobalAgentConversationSession(String(binding.exactSessionId), binding.scope === "feishu" ? "feishu" : "web");
        if ((result as any)?.deleted || (result as any)?.session || (result as any)?.lifecycleTombstone) removed.push({ scope: binding.scope, sessionId: binding.exactSessionId });
      } else if (binding.scope === "project") {
        const file = getSessionFilePath(String(binding.scopeId), String(binding.exactSessionId));
        if (fs.existsSync(file)) { fs.unlinkSync(file); removed.push({ scope: binding.scope, sessionId: binding.exactSessionId }); }
      }
    } catch { /* cleanup is best effort; task purge remains authoritative */ }
  }
  return removed;
}
