import { loadTasks } from "../core/db";
import { buildTaskUserRuntimeStatus } from "../agents/task-user-runtime";
import { appendUserVisibleAgentEvent, buildUserVisibleAgentResult } from "./user-visible-agent-events";

export type TaskConversationProjectionStatus = "synced" | "unchanged" | "skipped" | "failed";

export type TaskConversationProjectionReceiptV1 = {
  schema: "ccm-task-conversation-projection-receipt-v1";
  taskId: string;
  scope: "project" | "group" | "global" | "feishu";
  sourceSessionId: string;
  activeSessionId: string;
  taskRevision: number;
  status: TaskConversationProjectionStatus;
  updatedSessionIds: string[];
  issues: string[];
  reason: string;
  contentStored: false;
};

const text = (value: unknown, max = 2_000) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const terminalStatuses = new Set(["done", "completed", "success", "failed", "blocked", "cancelled", "canceled", "interrupted"]);

function scopeOf(task: any): TaskConversationProjectionReceiptV1["scope"] {
  if (text(task?.group_id || task?.groupId, 200)) return "group";
  if (text(task?.project_session_id || task?.projectSessionId, 300) || text(task?.orchestration_scope, 80) === "project_session") return "project";
  if (text(task?.source_channel || task?.request_origin, 60).toLowerCase().includes("feishu")) return "feishu";
  if (text(task?.global_mission_id || task?.globalMissionId || task?.workflow_meta?.global_direct_dispatch?.session_id, 240)) return "global";
  if (text(task?.target_project || task?.project_id || task?.project, 240)) return "project";
  return "global";
}

function sourceSessionOf(task: any) {
  return text(task?.exact_session_id || task?.group_session_id || task?.project_session_id || task?.origin_session_id || task?.source_conversation_ref?.exactSessionId, 300);
}

function activeSessionOf(task: any) {
  const bindings = Array.isArray(task?.task_context?.sessionBindings) ? task.task_context.sessionBindings : [];
  const activeBinding = [...bindings].reverse().find((item: any) => item?.status === "active" && item?.role !== "source");
  return text(task?.execution_session_id || task?.active_execution_session_id || task?.recovery_user_session?.activeSessionId || activeBinding?.exactSessionId || sourceSessionOf(task), 300);
}

function taskAttempt(task: any) {
  return Math.max(0, Number(task?.execution_attempt || task?.attempt || task?.recovery_preflight?.nextAttempt || task?.task_context?.latestAttempt || 0));
}

function changedFileCount(task: any) {
  const files = task?.file_changes?.files || task?.delivery_summary?.actual_file_changes || task?.receipt?.filesChanged || [];
  return Array.isArray(files) ? files.length : Math.max(0, Number(task?.file_changes?.count || 0));
}

function verificationCount(task: any) {
  const rows = task?.verification || task?.delivery_summary?.verification || task?.receipt?.verification || [];
  return Array.isArray(rows) ? rows.length : 0;
}

function terminalProjection(task: any) {
  const status = text(task?.status, 40).toLowerCase();
  if (!terminalStatuses.has(status)) return null;
  const accepted = ["done", "completed", "success"].includes(status)
    && (text(task?.acceptance_state, 80).toLowerCase() === "accepted"
      || task?.terminal_gate?.passed === true
      || task?.terminal_decision?.accepted === true
      || task?.delivery_summary?.acceptance_gate_passed === true);
  const summaryStatus = accepted ? "success"
    : status === "blocked" ? "blocked"
      : ["cancelled", "canceled"].includes(status) ? "cancelled"
        : status === "interrupted" ? "interrupted"
          : "failed";
  return { status, accepted, summaryStatus };
}

export function taskConversationProjectionContent(task: any, options: { sourceLink?: boolean; activeSessionId?: string } = {}) {
  const status = text(task?.status, 40).toLowerCase();
  const attempt = taskAttempt(task);
  const detail = text(task?.status_detail || task?.statusDetail || task?.delivery_summary?.headline || task?.result, 500);
  if (options.sourceLink && options.activeSessionId && options.activeSessionId !== sourceSessionOf(task)) {
    if (terminalStatuses.has(status)) return status === "done" || status === "completed" || status === "success"
      ? `任务已在恢复会话中完成：${detail || "最终验收已通过"}。`
      : `任务已在恢复会话中结束：${detail || "请查看恢复会话中的最新状态"}。`;
    return `任务已转到恢复会话继续${attempt ? `（第 ${attempt} 次执行）` : ""}，当前进展请在恢复会话中查看。`;
  }
  if (["done", "completed", "success"].includes(status)) {
    const facts = [changedFileCount(task) ? `修改 ${changedFileCount(task)} 个文件` : "", verificationCount(task) ? `验证 ${verificationCount(task)} 项` : ""].filter(Boolean).join("，");
    return `任务已完成：${detail || "最终验收已通过"}${facts ? `；${facts}` : ""}。`;
  }
  if (status === "failed") return `任务未能完成：${detail || "执行失败，证据和现场已经保留"}。`;
  if (status === "blocked") return `任务需要处理：${detail || "当前存在阻塞，任务现场已经保留"}。`;
  if (["cancelled", "canceled"].includes(status)) return `任务已取消：${detail || "任务现场和历史记录已经保留"}。`;
  if (status === "interrupted") return `任务已中断：${detail || "可以从最近安全检查点继续"}。`;
  if (["pending", "queued", "in_progress", "running", "reviewing", "executing", "recovery_validating"].includes(status)) {
    return `任务正在继续执行${attempt ? `（第 ${attempt} 次执行）` : ""}：${detail || "已从最近安全检查点接续"}。`;
  }
  return detail || "任务状态已经更新。";
}

function projectionRevision(task: any) {
  return Math.max(0, Number(task?.revision || task?.task_context_revision || 0));
}

function messageTaskId(message: any) {
  return text(message?.task_id || message?.taskId || message?.taskExperience?.task_id || message?.task?.id, 160);
}

function shouldReplaceMessage(existing: any, task: any, content: string) {
  if (!existing) return true;
  const existingProjection = existing?.taskExperience || existing?.task || {};
  const existingRevision = Math.max(-1, Number(existingProjection?.revision ?? existingProjection?.task_revision ?? -1));
  const nextRevision = projectionRevision(task);
  if (existingRevision > nextRevision) return false;
  const expectedRuntime = buildTaskUserRuntimeStatus(task);
  const existingRuntime = existingProjection?.runtime_status || existingProjection?.runtimeStatus || {};
  if (String(existingRuntime?.phase || "") !== expectedRuntime.phase
    || existingRuntime?.terminal !== expectedRuntime.terminal
    || (expectedRuntime.terminal && Array.isArray(existingProjection?.actions) && existingProjection.actions.length > 0)
    || verificationCount(task) > (Array.isArray(existingProjection?.verification) ? existingProjection.verification.length : 0)) return true;
  const existingStatus = text(existingProjection?.status, 40).toLowerCase();
  const nextStatus = text(task?.status, 40).toLowerCase();
  if (existingRevision === nextRevision && existingStatus === nextStatus && text(existing?.content, 2_000) === text(content, 2_000)) return false;
  return true;
}

function publicTaskProjection(task: any, activeSessionId: string) {
  const terminal = terminalProjection(task);
  const derivedRuntimeStatus = buildTaskUserRuntimeStatus(task);
  const runtimeStatus = terminal ? {
    ...derivedRuntimeStatus,
    next_action: terminal.accepted
      ? "可以查看变更文件、验证结果和任务回放。"
      : terminal.summaryStatus === "cancelled"
        ? "如需继续，请重新发起任务。"
        : "可以从任务回放查看证据并重新执行。",
  } : derivedRuntimeStatus;
  const verification = Array.isArray(task?.verification) && task.verification.length
    ? task.verification
    : Array.isArray(task?.delivery_summary?.verification) ? task.delivery_summary.verification
      : Array.isArray(task?.receipt?.verification) ? task.receipt.verification : [];
  const projected: any = {
    id: text(task?.id, 160),
    task_id: text(task?.id, 160),
    trace_id: text(task?.trace_id, 160),
    project: text(task?.target_project || task?.project_id || task?.project, 240),
    project_session_id: text(task?.project_session_id, 300),
    project_main_run_id: text(task?.project_main_run_id || task?.run_id, 180),
    status: text(task?.status, 40),
    phase: runtimeStatus.phase,
    phase_label: runtimeStatus.phase_label,
    runtime_status: runtimeStatus,
    status_detail: text(task?.status_detail || task?.result, 500),
    next_action: runtimeStatus.next_action,
    completed_at: runtimeStatus.completed_at,
    acceptance_state: text(task?.acceptance_state, 80),
    final_summary: text(task?.final_summary || task?.result, 2_000),
    file_changes: task?.file_changes || null,
    verification,
    work_items: Array.isArray(task?.work_items) ? task.work_items : [],
    work_item_summary: task?.work_item_summary || null,
    completion_summary: task?.completion_summary || task?.delivery_summary?.completionSummary || (terminal ? {
      schema: "ccm-completion-summary-v1",
      status: terminal.summaryStatus,
      headline: text(task?.status_detail || task?.delivery_summary?.headline || task?.result, 500)
        || (terminal.accepted ? "最终验收已通过" : "任务未正式交付"),
      filesChanged: changedFileCount(task),
      verificationPassed: verificationCount(task),
      verificationFailed: terminal.accepted ? 0 : verification.filter((item: any) => text(item?.status, 40).toLowerCase() === "failed").length,
      blockers: terminal.accepted ? [] : [text(task?.status_detail || task?.result, 500)].filter(Boolean),
      source: "terminal_gate",
      contentStored: false,
    } : null),
    recovery: task?.recovery || null,
    recovery_pending: task?.recovery_pending === true,
    recovery_preflight: task?.recovery_preflight || null,
    recovery_transaction: task?.recovery_transaction || null,
    task_context_revision: Math.max(0, Number(task?.task_context_revision || task?.task_context?.revision || 0)),
    task_context_checksum: text(task?.task_context_checksum || task?.task_context?.checksum, 160),
    actions: terminal ? [] : Array.isArray(task?.actions) ? task.actions : [],
  };
  return {
    ...projected,
    revision: projectionRevision(task),
    execution_attempt: taskAttempt(task),
    source_session_id: sourceSessionOf(task),
    active_execution_session_id: activeSessionId,
    conversation_projection_revision: projectionRevision(task),
    requires_card: true,
  };
}

function appendTerminalExecutionProjection(task: any, scope: TaskConversationProjectionReceiptV1["scope"], scopeId: string, sessionId: string) {
  const terminal = terminalProjection(task);
  if (!terminal || !scopeId || !sessionId) return null;
  const taskId = text(task?.id, 160);
  const fileChanges = task?.file_changes?.files || task?.delivery_summary?.actual_file_changes || task?.receipt?.filesChanged || [];
  const verification = task?.verification || task?.delivery_summary?.verification || task?.receipt?.verification || [];
  const detail = text(task?.status_detail || task?.delivery_summary?.headline || task?.result, 500)
    || (terminal.accepted ? "最终验收已通过" : "任务未正式交付");
  const visibleResult = buildUserVisibleAgentResult({
    status: terminal.summaryStatus,
    text: detail,
    fileChanges,
    verification,
    unfinished: terminal.accepted ? [] : [detail],
    source: "terminal_gate",
    terminalGate: { passed: terminal.accepted, accepted: terminal.accepted },
    blockers: terminal.accepted ? [] : [detail],
  });
  return appendUserVisibleAgentEvent({
    // v2 intentionally uses a new stable identity. Older projections omitted
    // the sanitized Terminal Gate and must not block the corrected event from
    // being appended during startup reconciliation.
    eventId: `task-conversation-projection:${taskId}:${projectionRevision(task)}:terminal-result-v2:${terminal.summaryStatus}`,
    scope,
    scopeId,
    exactSessionId: sessionId,
    anchorMessageId: text(task?.message_id || `project-main-task:${taskId}`, 180),
    generation: Math.max(0, Number(task?.generation || 0)),
    attempt: taskAttempt(task),
    taskId,
    eventType: "result",
    display: {
      title: terminal.accepted ? "任务已完成" : terminal.summaryStatus === "cancelled" ? "任务已取消" : terminal.summaryStatus === "interrupted" ? "任务已中断" : "任务未完成",
      target: text(task?.title, 300),
      summary: detail,
      status: terminal.accepted ? "success" : "failed",
    },
    result: visibleResult,
    fileChanges,
    evidenceIds: verification,
    detail: {
      terminalGate: { passed: terminal.accepted, accepted: terminal.accepted, source: "task_ledger" },
      completionSummary: visibleResult.completionSummary,
    },
  });
}

function syncProjectSession(task: any, sessionId: string, content: string, sourceLink: boolean) {
  const project = text(task?.target_project || task?.project_id || task?.project, 240);
  if (!project || !sessionId) return { status: "skipped" as const, updated: false, issue: "project_session_identity_missing" };
  const sessions = require("../modules/projects/sessions");
  const detail = sessions.getSessionDetail(project, sessionId);
  if (!detail) return { status: "skipped" as const, updated: false, issue: "project_session_unavailable" };
  const existing = (Array.isArray(detail.history) ? detail.history : []).find((message: any) => messageTaskId(message) === text(task?.id, 160));
  const existingRevision = Math.max(-1, Number(existing?.taskExperience?.revision ?? existing?.task?.revision ?? -1));
  if (existingRevision > projectionRevision(task)) return { status: "skipped" as const, updated: false, issue: "stale_task_revision" };
  if (!shouldReplaceMessage(existing, task, content)) {
    appendTerminalExecutionProjection(task, "project", project, sessionId);
    return { status: "unchanged" as const, updated: false, issue: "" };
  }
  const projected = publicTaskProjection(task, activeSessionOf(task));
  sessions.upsertProjectSessionTaskMessage(project, sessionId, {
    id: text(existing?.id || task?.message_id || `project-main-task:${task.id}`, 180),
    role: "assistant",
    content,
    timestamp: existing?.timestamp || task?.updated_at || new Date().toISOString(),
    messageMode: "task",
    type: sourceLink ? "task_recovery_link" : "project_main_task",
    task_id: text(task?.id, 160),
    run_id: text(task?.project_main_run_id || task?.run_id, 180),
    taskExperience: { ...(existing?.taskExperience || {}), ...projected },
    fileChanges: task?.file_changes || null,
    source: sourceLink ? "task-recovery-source-projection" : "task-conversation-projection",
  });
  appendTerminalExecutionProjection(task, "project", project, sessionId);
  return { status: "synced" as const, updated: true, issue: "" };
}

function syncGroupSession(task: any, sessionId: string, content: string, sourceLink = false) {
  const groupId = text(task?.group_id || task?.groupId, 240);
  if (!groupId || !sessionId) return { status: "skipped" as const, updated: false, issue: "group_session_identity_missing" };
  const runtime = require("../modules/collaboration/collaboration-runtime-task-queue");
  const result = runtime.updateGroupTaskInlineStatus({
    ...task,
    group_session_id: sessionId,
    conversation_projection_content: content,
    conversation_projection_source_link: sourceLink,
  }, text(task?.status, 40), text(task?.status_detail || content, 500));
  if (!result) return { status: "skipped" as const, updated: false, issue: "group_task_message_unavailable" };
  if (result.projectionRejected) return { status: "skipped" as const, updated: false, issue: "stale_task_revision" };
  appendTerminalExecutionProjection(task, "group", groupId, sessionId);
  return result.projectionUpdated
    ? { status: "synced" as const, updated: true, issue: "" }
    : { status: "unchanged" as const, updated: false, issue: "" };
}

function syncGlobalSession(task: any, sessionId: string, content: string, sourceLink = false) {
  if (!sessionId) return { status: "skipped" as const, updated: false, issue: "global_session_identity_missing" };
  const globalAgent = require("../modules/global/global-agent");
  const result = globalAgent.upsertGlobalAgentConversationTaskMessage(sessionId, {
    id: text(task?.message_id || `global-task:${task.id}`, 180),
    role: "assistant",
    content,
    timestamp: task?.updated_at || new Date().toISOString(),
    type: sourceLink ? "task_recovery_link" : "global_task",
    source: sourceLink ? "task-recovery-source-projection" : "task-conversation-projection",
    task_id: text(task?.id, 160),
    taskExperience: publicTaskProjection(task, activeSessionOf(task)),
  });
  if (result?.reason === "stale_revision") return { status: "skipped" as const, updated: false, issue: "stale_task_revision" };
  const scope = scopeOf(task);
  appendTerminalExecutionProjection(task, scope, scope === "feishu" ? text(task?.source_conversation_ref?.scopeId || task?.chat_id || task?.open_chat_id, 240) || "feishu" : "global", sessionId);
  return result?.updated ? { status: "synced" as const, updated: true, issue: "" } : result?.reason === "session_unavailable" ? { status: "skipped" as const, updated: false, issue: "global_session_unavailable" } : { status: "unchanged" as const, updated: false, issue: "" };
}

export function syncTaskConversationProjection(task: any, reason = "task_updated"): TaskConversationProjectionReceiptV1 {
  const taskId = text(task?.id, 160);
  const scope = scopeOf(task);
  const sourceSessionId = sourceSessionOf(task);
  const activeSessionId = activeSessionOf(task);
  const receipt: TaskConversationProjectionReceiptV1 = {
    schema: "ccm-task-conversation-projection-receipt-v1",
    taskId,
    scope,
    sourceSessionId,
    activeSessionId,
    taskRevision: projectionRevision(task),
    status: "skipped",
    updatedSessionIds: [],
    issues: [],
    reason: text(reason, 160),
    contentStored: false,
  };
  if (!taskId || (!sourceSessionId && !activeSessionId)) {
    receipt.issues.push("conversation_identity_missing");
    return receipt;
  }
  try {
    if (scope === "project") {
      const targetSessionId = activeSessionId || sourceSessionId;
      const activeResult = syncProjectSession(task, targetSessionId, taskConversationProjectionContent(task), false);
      if (activeResult.updated) receipt.updatedSessionIds.push(targetSessionId);
      if (activeResult.issue) receipt.issues.push(activeResult.issue);
      if (sourceSessionId && sourceSessionId !== targetSessionId) {
        const sourceResult = syncProjectSession(task, sourceSessionId, taskConversationProjectionContent(task, { sourceLink: true, activeSessionId: targetSessionId }), true);
        if (sourceResult.updated) receipt.updatedSessionIds.push(sourceSessionId);
        if (sourceResult.issue && sourceResult.issue !== "project_session_unavailable") receipt.issues.push(sourceResult.issue);
      }
      receipt.status = receipt.updatedSessionIds.length ? "synced" : activeResult.status;
    } else if (scope === "group") {
      const targetSessionId = activeSessionId || sourceSessionId;
      const result = syncGroupSession(task, targetSessionId, taskConversationProjectionContent(task));
      receipt.status = result.status;
      if (result.updated) receipt.updatedSessionIds.push(targetSessionId);
      if (result.issue) receipt.issues.push(result.issue);
      if (sourceSessionId && sourceSessionId !== targetSessionId) {
        const sourceResult = syncGroupSession(task, sourceSessionId, taskConversationProjectionContent(task, { sourceLink: true, activeSessionId: targetSessionId }), true);
        if (sourceResult.updated) receipt.updatedSessionIds.push(sourceSessionId);
        if (sourceResult.issue && sourceResult.issue !== "group_task_message_unavailable") receipt.issues.push(sourceResult.issue);
      }
      if (receipt.updatedSessionIds.length) receipt.status = "synced";
    } else {
      const targetSessionId = activeSessionId || sourceSessionId;
      const result = syncGlobalSession(task, targetSessionId, taskConversationProjectionContent(task));
      receipt.status = result.status;
      if (result.updated) receipt.updatedSessionIds.push(targetSessionId);
      if (result.issue) receipt.issues.push(result.issue);
      if (sourceSessionId && sourceSessionId !== targetSessionId) {
        const sourceResult = syncGlobalSession(task, sourceSessionId, taskConversationProjectionContent(task, { sourceLink: true, activeSessionId: targetSessionId }), true);
        if (sourceResult.updated) receipt.updatedSessionIds.push(sourceSessionId);
        if (sourceResult.issue && sourceResult.issue !== "global_session_unavailable") receipt.issues.push(sourceResult.issue);
      }
      if (receipt.updatedSessionIds.length) receipt.status = "synced";
    }
  } catch (error: any) {
    receipt.status = "failed";
    receipt.issues.push(text(error?.message || error, 500) || "projection_sync_failed");
  }
  return receipt;
}

export function reconcileTaskConversationProjections() {
  const tasks = loadTasks().filter((task: any) => !task?.archived && text(task?.id, 160));
  const receipts = tasks.map((task: any) => syncTaskConversationProjection(task, "startup_reconciliation"));
  return {
    checked: receipts.length,
    synced: receipts.filter(item => item.status === "synced").length,
    unchanged: receipts.filter(item => item.status === "unchanged").length,
    skipped: receipts.filter(item => item.status === "skipped").length,
    failed: receipts.filter(item => item.status === "failed").length,
    receipts,
    contentStored: false,
  };
}

export function shouldSyncTaskConversationProjection(updates: any) {
  const keys = new Set(Object.keys(updates || {}));
  return [
    "status", "status_detail", "statusDetail", "acceptance_state", "result", "final_summary", "delivery_summary",
    "file_changes", "verification", "work_items", "receipt", "recovery", "recovery_pending", "recovery_preflight",
    "recovery_transaction", "execution_attempt", "active_execution_session_id", "execution_session_id", "task_context",
    "queue_state", "queue_position", "queue_target_key", "queued_at",
  ].some(key => keys.has(key));
}
