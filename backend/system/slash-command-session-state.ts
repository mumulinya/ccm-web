import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

const STATE_FILE = path.join(CCM_DIR, "slash-command-conversation-state.json");

export const GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED = "全局会话不支持 Plan 模式。全局 Agent 不读取项目代码；实现计划请到群聊或项目主 Agent 会话。";

export function conversationPlanModeSupported(scope: "global" | "project" | "group") {
  return scope === "project" || scope === "group";
}

function sessionKey(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string) {
  const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
  return `${scope}:${normalizedScopeId}:${String(exactSessionId || "").trim()}`;
}

export function readSlashCommandSessionState(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string) {
  const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
  const sessionId = String(exactSessionId || "").trim();
  if (!sessionId || !normalizedScopeId) return { revision: 0, generation: 0, preferences: {}, planMode: { enabled: false } };
  const store: any = readJsonWithBackup(STATE_FILE, { sessions: {} });
  const state = store.sessions?.[sessionKey(scope, scopeId, sessionId)] || {};
  return {
    revision: Math.max(0, Number(state.revision || 0)),
    generation: Math.max(0, Number(state.generation || 0)),
    preferences: state.preferences && typeof state.preferences === "object" ? state.preferences : {},
    planMode: state.planMode && typeof state.planMode === "object" ? state.planMode : { enabled: false },
  };
}

export function exitSlashCommandSessionPlanMode(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string) {
  const sessionId = String(exactSessionId || "").trim();
  const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
  if (!sessionId || !normalizedScopeId) return { exited: false };
  const current = readSlashCommandSessionState(scope, scopeId, sessionId);
  if (current.planMode?.enabled !== true) {
    return { exited: false, alreadyAgent: true, revision: current.revision, generation: current.generation };
  }
  return withFileLock(STATE_FILE, () => {
    const store: any = readJsonWithBackup(STATE_FILE, { sessions: {} });
    store.sessions = store.sessions && typeof store.sessions === "object" ? store.sessions : {};
    const key = sessionKey(scope, scopeId, sessionId);
    const previous = store.sessions[key] || { revision: 0, generation: 0 };
    const now = new Date().toISOString();
    const planMode = {
      enabled: false,
      planId: String(previous.planMode?.planId || ""),
      description: String(previous.planMode?.description || ""),
      exitedAt: now,
      updatedAt: now,
    };
    const next = { ...previous, planMode, revision: Number(previous.revision || 0) + 1, updatedAt: now };
    store.sessions[key] = next;
    store.revision = Number(store.revision || 0) + 1;
    store.updatedAt = now;
    writeJsonAtomic(STATE_FILE, store);
    return { exited: true, revision: next.revision, generation: Number(next.generation || 0), planMode };
  });
}

export function renderSlashCommandSessionDirective(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string) {
  const state = readSlashCommandSessionState(scope, scopeId, exactSessionId);
  const lines = [];
  if (conversationPlanModeSupported(scope) && state.planMode?.enabled === true) {
    lines.push("The exact session is in Plan Mode: allow analysis, reads, and plan authoring only. Explore read-only first, then call ccm_present_plan. Do not dispatch writes, edit code, or perform side effects.", state.planMode.description ? `Plan Mode goal: ${String(state.planMode.description).slice(0, 4000)}` : "");
  }
  const style = String(state.preferences?.outputStyle || "").trim();
  if (style) lines.push(`Session output style=${style}: concise=direct, balanced=moderate detail, detailed=expanded; this never overrides safety or evidence requirements.`);
  return lines.filter(Boolean).join("\n");
}
