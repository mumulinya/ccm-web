import * as crypto from "crypto";
import { loadTasks, saveTasks } from "../../core/db";
import {
  appendGroupLogRecord,
  appendTaskLogRecord,
  clearGroupLogRecords,
  clearTaskLogRecords,
  getTaskLogRecords,
  loadGroupLogsFromSqlite,
  replaceGroupLogsInSqlite,
} from "../../core/task-store";
import { appendTraceEvent, ensureTraceId } from "../../system/reliability-ledger";

// === 群聊日志管理 ===
export function safeAddGroupLog(groupId: string, level: string, category: string, message: string, details: any = null) {
  try {
    appendGroupLogRecord(groupId, {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    }, 500);
  } catch (e: any) {
    console.error("保存群聊日志失败:", e.message);
  }
}

export function loadGroupLogs() {
  try {
    return loadGroupLogsFromSqlite();
  } catch (e: any) {
    console.error("加载群聊日志失败:", e.message);
  }
  return {};
}

export function saveGroupLogs(logs: any) {
  try {
    replaceGroupLogsInSqlite(logs);
  } catch (e: any) {
    console.error("保存群聊日志失败:", e.message);
  }
}

export function clearGroupLogs(groupId: string) {
  try {
    return clearGroupLogRecords(groupId);
  } catch (e: any) {
    console.error("清空群聊日志失败:", e.message);
    return 0;
  }
}

export function addGroupLog(groupId: string, level: string, category: string, message: string, details: any = null) {
  appendGroupLogRecord(groupId, {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  }, 500);
}

// === 任务日志系统 ===
export function addTaskLog(taskId: string, level: string, message: string): void {
  appendTaskLogRecord(taskId, {
    timestamp: new Date().toISOString(),
    level,
    message
  }, 100);
  console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}

export function appendTaskTimelineEvent(taskId: string, event: any = {}) {
  if (!taskId) return null;
  try {
    const tasks = loadTasks();
    const idx = tasks.findIndex((task: any) => task.id === taskId);
    if (idx < 0) return null;
    const now = new Date().toISOString();
    const current = Array.isArray(tasks[idx].workflow_timeline) ? tasks[idx].workflow_timeline : [];
    const nextEvent = {
      id: event.id || `tl_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
      at: event.at || now,
      type: event.type || "event",
      title: String(event.title || event.message || "任务事件"),
      detail: String(event.detail || ""),
      status: event.status || event.level || "info",
      agent: event.agent || "",
      phase: event.phase || "",
      data: event.data || {},
    };
    tasks[idx].workflow_timeline = [...current, nextEvent].slice(-160);
    tasks[idx].updated_at = now;
    tasks[idx].trace_id = ensureTraceId(tasks[idx].trace_id, "task");
    saveTasks(tasks);
    appendTraceEvent(tasks[idx].trace_id, { id: `timeline:${taskId}:${nextEvent.id}`, type: `timeline.${nextEvent.type}`, status: nextEvent.status, task_id: taskId, group_id: tasks[idx].group_id || "", agent: nextEvent.agent, message: nextEvent.detail || nextEvent.title, data: { phase: nextEvent.phase, ...(nextEvent.data || {}) } });
    return nextEvent;
  } catch (e: any) {
    console.warn("记录任务时间线失败:", e?.message || e);
    return null;
  }
}

export function getTaskTimeline(task: any, execution: any = {}) {
  const timeline = [
    ...(Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []),
    ...(Array.isArray(execution?.timeline) ? execution.timeline : []),
  ].filter(Boolean);
  const seen = new Set<string>();
  return timeline.filter((item: any) => {
    const key = item.id || `${item.at}|${item.type}|${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(-160);
}

export function getTaskLogs(taskId: string, limit = 50) {
  return getTaskLogRecords(taskId, limit);
}

export function clearTaskLogs(taskId: string) {
  return clearTaskLogRecords(taskId);
}
