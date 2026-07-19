import * as crypto from "crypto";
import { normalizeAgentRuntimeId } from "../../agents/runtime";
import {
  closeTaskAgentSessions,
  getTaskAgentSessionOptions,
  listTaskAgentSessions,
  openTaskAgentSession,
  purgeTaskAgentSessions,
  reopenTaskAgentSessions,
} from "../../tasks/agent-sessions";
import { validateProjectName, validateSessionId } from "./project-validation";

export const PROJECT_WEB_SESSION_AGENT_GROUP = "project-chat";
const activeProjectSessionDispatches = new Set<string>();

export function buildProjectSessionAgentScopeId(project: string, projectSessionId: string) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(projectSessionId);
  const digest = crypto.createHash("sha256").update(`${safeProject}\u0000${safeSessionId}`).digest("hex").slice(0, 28);
  return `project-session:${digest}`;
}

export function acquireProjectSessionAgentDispatch(project: string, projectSessionId: string) {
  const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
  if (activeProjectSessionDispatches.has(scopeId)) return { acquired: false, scopeId };
  activeProjectSessionDispatches.add(scopeId);
  return { acquired: true, scopeId };
}

export function releaseProjectSessionAgentDispatch(scopeId: string) {
  return activeProjectSessionDispatches.delete(String(scopeId || ""));
}

export function isProjectSessionAgentDispatchActive(project: string, projectSessionId: string) {
  return activeProjectSessionDispatches.has(buildProjectSessionAgentScopeId(project, projectSessionId));
}

export function getProjectSessionAgentBinding(project: string, projectSessionId: string) {
  const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
  const sessions = listTaskAgentSessions({ scopeId, groupId: PROJECT_WEB_SESSION_AGENT_GROUP })
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const active = [...sessions].reverse().find(session => session.status === "open") || null;
  return {
    schema: "ccm-project-session-agent-binding-v1",
    project,
    project_session_id: projectSessionId,
    scope_id: scopeId,
    generation: active ? sessions.findIndex(session => session.id === active.id) + 1 : sessions.length,
    task_agent_session_id: active?.id || "",
    native_session_id: active?.nativeSessionId || "",
    provider: active?.agentType || "",
    resume_mode: active?.resumeMode || "",
    turn_count: Number(active?.turnCount || 0),
    status: active ? "open" : sessions.length ? "closed" : "unbound",
    generation_count: sessions.length,
  };
}

export function bindProjectSessionAgentExecution(input: { project: string; projectSessionId: string; agentType: string }) {
  const project = validateProjectName(input.project);
  const projectSessionId = validateSessionId(input.projectSessionId);
  const agentType = normalizeAgentRuntimeId(input.agentType);
  const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
  const open = listTaskAgentSessions({ scopeId, groupId: PROJECT_WEB_SESSION_AGENT_GROUP, status: "open" });
  if (open.some(session => session.agentType !== agentType)) {
    closeTaskAgentSessions({ scopeId, groupId: PROJECT_WEB_SESSION_AGENT_GROUP }, `项目会话切换执行器到 ${agentType}`);
  }
  const session = openTaskAgentSession({
    scopeId,
    taskId: scopeId,
    groupId: PROJECT_WEB_SESSION_AGENT_GROUP,
    project,
    agentType,
  });
  const binding = getProjectSessionAgentBinding(project, projectSessionId);
  return { session, options: getTaskAgentSessionOptions(session), binding };
}

export function rotateProjectSessionAgentBinding(project: string, projectSessionId: string, reason = "项目会话开始新世代") {
  const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
  if (activeProjectSessionDispatches.has(scopeId)) throw new Error("当前项目会话仍有第三方 Agent 正在执行，不能切换会话世代");
  const closed = closeTaskAgentSessions({ scopeId, groupId: PROJECT_WEB_SESSION_AGENT_GROUP }, reason);
  return { scopeId, closed, nextGeneration: getProjectSessionAgentBinding(project, projectSessionId).generation_count + 1 };
}

export function purgeProjectSessionAgentBinding(project: string, projectSessionId: string) {
  const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
  return { scopeId, removed: purgeTaskAgentSessions(scopeId) };
}

export function reopenProjectSessionAgentBinding(project: string, projectSessionId: string, reason = "项目会话世代提交回滚") {
  const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
  return { scopeId, reopened: reopenTaskAgentSessions(scopeId, reason) };
}
