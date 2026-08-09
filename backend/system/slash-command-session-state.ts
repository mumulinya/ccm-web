import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { readJsonWithBackup } from "../core/atomic-json-file";

const STATE_FILE = path.join(CCM_DIR, "slash-command-conversation-state.json");

export function readSlashCommandSessionState(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string) {
  const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
  const sessionId = String(exactSessionId || "").trim();
  if (!sessionId || !normalizedScopeId) return { revision: 0, generation: 0, preferences: {}, planMode: { enabled: false } };
  const store: any = readJsonWithBackup(STATE_FILE, { sessions: {} });
  const state = store.sessions?.[`${scope}:${normalizedScopeId}:${sessionId}`] || {};
  return {
    revision: Math.max(0, Number(state.revision || 0)),
    generation: Math.max(0, Number(state.generation || 0)),
    preferences: state.preferences && typeof state.preferences === "object" ? state.preferences : {},
    planMode: state.planMode && typeof state.planMode === "object" ? state.planMode : { enabled: false },
  };
}

export function renderSlashCommandSessionDirective(scope: "global" | "project" | "group", scopeId: string, exactSessionId: string) {
  const state = readSlashCommandSessionState(scope, scopeId, exactSessionId);
  const lines = [];
  if (state.planMode?.enabled === true) {
    lines.push("当前精确会话处于 Plan Mode：只允许分析、读取和制定计划，不得派发写任务、修改代码或执行有副作用操作。", state.planMode.description ? `Plan Mode 目标：${String(state.planMode.description).slice(0, 4000)}` : "");
  }
  const style = String(state.preferences?.outputStyle || "").trim();
  if (style) lines.push(`当前会话输出风格=${style}：concise=简洁直接，balanced=平衡，detailed=充分展开；不覆盖安全与证据要求。`);
  return lines.filter(Boolean).join("\n");
}
