import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

const STATE_FILE = path.join(CCM_DIR, "slash-command-conversation-state.json");

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
  if (state.planMode?.enabled === true) {
    lines.push("当前精确会话处于 Plan Mode：只允许分析、读取和制定计划，鼓励只读探索后必须调用 ccm_present_plan 出卡，不得派发写任务、修改代码或执行有副作用操作。", state.planMode.description ? `Plan Mode 目标：${String(state.planMode.description).slice(0, 4000)}` : "");
  }
  const style = String(state.preferences?.outputStyle || "").trim();
  if (style) lines.push(`当前会话输出风格=${style}：concise=简洁直接，balanced=平衡，detailed=充分展开；不覆盖安全与证据要求。`);
  return lines.filter(Boolean).join("\n");
}
