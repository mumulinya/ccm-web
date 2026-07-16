import * as fs from "fs";
import * as path from "path";
import {
  purgeTaskAgentSessions,
} from "../tasks/agent-sessions";
import {
  createExecutionCheckpoint,
  purgeTaskExecutionArtifacts,
  terminateManagedChildProcess,
} from "../agents/execution-kernel";
import { CCM_DIR } from "../core/utils";

export const PROJECT_CHAT_RUNS_FILE = path.join(CCM_DIR, "project-chat-runs.json");

export const projectChatRuns = new Map<string, any>();

function serializableProjectChatRun(run: any) {
  if (!run) return null;
  return {
    id: run.id,
    trace_id: run.trace_id,
    project: run.project,
    message: run.message,
    workDir: run.workDir,
    status: run.status,
    checkpoint_id: run.checkpoint_id || "",
    checkpoint: run.checkpoint || null,
    rollback: run.rollback || null,
    fileChanges: run.fileChanges || null,
    message_mode: run.message_mode || "",
    workflow_decision: run.workflow_decision || null,
    workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [],
    parent_run_id: run.parent_run_id || "",
    task_session_scope_id: run.task_session_scope_id || "",
    task_agent_session_id: run.task_agent_session_id || "",
    native_session_id: run.native_session_id || "",
    resume_mode: run.resume_mode || "",
    archived: !!run.archived,
    archived_at: run.archived_at || "",
    deleted_at: run.deleted_at || "",
    deletion_reason: run.deletion_reason || "",
    created_at: run.created_at,
    updated_at: run.updated_at,
  };
}

export function saveProjectChatRuns() {
  try {
    const runs = [...projectChatRuns.values()].map(serializableProjectChatRun).filter(Boolean).slice(-200);
    fs.mkdirSync(path.dirname(PROJECT_CHAT_RUNS_FILE), { recursive: true });
    fs.writeFileSync(PROJECT_CHAT_RUNS_FILE, JSON.stringify({ version: 1, updated_at: new Date().toISOString(), runs }, null, 2), "utf-8");
  } catch (error) {
    console.warn("[项目聊天运行] 持久化失败", error);
  }
}

export function loadProjectChatRuns() {
  try {
    if (!fs.existsSync(PROJECT_CHAT_RUNS_FILE)) return;
    const data = JSON.parse(fs.readFileSync(PROJECT_CHAT_RUNS_FILE, "utf-8"));
    const runs = Array.isArray(data?.runs) ? data.runs : [];
    for (const item of runs) {
      if (!item?.id) continue;
      projectChatRuns.set(String(item.id), { ...item, child: null });
    }
  } catch (error) {
    console.warn("[项目聊天运行] 读取持久化记录失败", error);
  }
}

export function createProjectChatRun(project: string, message: string, workDir: string, parentRunId = "") {
  const now = new Date().toISOString();
  const runId = "pchat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  const traceId = "project_chat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  let checkpoint: any = null;
  try {
    if (workDir) checkpoint = createExecutionCheckpoint({ executionId: runId, taskId: runId, workDir, mode: "project-chat", label: `项目聊天执行：${project}` });
  } catch (error: any) {
    checkpoint = { success: false, error: error?.message || String(error) };
  }
  const run: any = { id: runId, trace_id: traceId, project, message, workDir, status: "running", checkpoint_id: checkpoint?.checkpointId || checkpoint?.id || "", checkpoint, parent_run_id: parentRunId, task_session_scope_id: "", task_agent_session_id: "", native_session_id: "", resume_mode: "", created_at: now, updated_at: now, child: null, fileChanges: null, workEvents: [] };
  projectChatRuns.set(runId, run);
  saveProjectChatRuns();
  return run;
}

export function publicProjectChatRun(run: any) {
  if (!run) return null;
  return {
    id: run.id,
    trace_id: run.trace_id,
    project: run.project,
    status: run.status,
    message_mode: run.message_mode || "",
    workflow_decision: run.workflow_decision || null,
    checkpoint_id: run.checkpoint_id || "",
    rollback_available: !!run.checkpoint_id,
    parent_run_id: run.parent_run_id || "",
    task_session_scope_id: run.task_session_scope_id || "",
    task_agent_session_id: run.task_agent_session_id || "",
    native_session_id: run.native_session_id || "",
    resume_mode: run.resume_mode || "",
    archived: !!run.archived,
    archived_at: run.archived_at || "",
    deleted_at: run.deleted_at || "",
    deletion_reason: run.deletion_reason || "",
    created_at: run.created_at,
    updated_at: run.updated_at,
  };
}

export function archiveProjectChatRun(id: string, reason = "用户删除项目执行记录") {
  const run = projectChatRuns.get(String(id || "").trim());
  if (!run) return null;
  if (run.child) {
    try { terminateManagedChildProcess(run.child); } catch { try { run.child.kill(); } catch {} }
  }
  run.status = run.status === "running" ? "cancelled" : (run.status || "archived");
  run.archived = true;
  run.archived_at = run.archived_at || new Date().toISOString();
  run.deleted_at = new Date().toISOString();
  run.deletion_reason = reason;
  run.updated_at = new Date().toISOString();
  saveProjectChatRuns();
  return run;
}

export function purgeProjectChatRun(id: string) {
  const runId = String(id || "").trim();
  const run = projectChatRuns.get(runId);
  if (!run) return null;
  if (run.child) {
    try { terminateManagedChildProcess(run.child); } catch { try { run.child.kill(); } catch {} }
  }
  const cleanupIds = Array.from(new Set([
    run.id,
    run.task_session_scope_id,
    run.task_agent_session_id,
  ].map(value => String(value || "").trim()).filter(Boolean)));
  const cleanup = { sessions: 0, executions: 0, checkpoints: 0, outputs: 0 };
  for (const cleanupId of cleanupIds) {
    try { cleanup.sessions += purgeTaskAgentSessions(cleanupId).length; } catch {}
    try {
      const artifacts = purgeTaskExecutionArtifacts(cleanupId);
      cleanup.executions += Number(artifacts.executions || 0);
      cleanup.checkpoints += Number(artifacts.checkpoints || 0);
      cleanup.outputs += Number(artifacts.outputs || 0);
    } catch {}
  }
  projectChatRuns.delete(runId);
  saveProjectChatRuns();
  return { run, cleanup };
}
