import type { UserVisibleAgentEvent } from "./user-visible-agent-events";

export type UnifiedAgentTurnState =
  | "thinking" | "planning" | "executing" | "waiting_user" | "waiting_dependency"
  | "verifying" | "completed" | "failed" | "interrupted" | "cancelled";

function generationRows(events: UserVisibleAgentEvent[]) {
  const generation = events.reduce((max, event) => Math.max(max, Number(event.generation || 0)), 0);
  return { generation, rows: events.filter(event => !generation || Number(event.generation || 0) === generation) };
}

export function projectUnifiedAgentTurnState(events: UserVisibleAgentEvent[]) {
  const ordered = [...(events || [])].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const { generation, rows } = generationRows(ordered);
  const latestResult = [...rows].reverse().find(event => event.eventType === "result");
  if (latestResult) {
    const status = String(latestResult.display?.status || (latestResult.detail as any)?.result?.status || "").toLowerCase();
    const state: UnifiedAgentTurnState = /cancel/.test(status) ? "cancelled"
      : /interrupt|pause|waiting/.test(status) ? "interrupted"
        : /fail|error|blocked/.test(status) ? "failed" : "completed";
    return { state, generation, terminal: true, showThinking: false, eventId: latestResult.eventId, contentStored: false };
  }
  const latest = rows[rows.length - 1];
  const joined = rows.map(event => `${event.eventType} ${event.display?.status || ""} ${event.detail?.executionStage?.kind || ""} ${event.detail?.agentDisplay?.phase || ""}`).join(" ").toLowerCase();
  const state: UnifiedAgentTurnState = /permission_required|waiting_confirmation|blocked/.test(joined) ? "waiting_user"
    : /waiting_dependency|queued_dependency/.test(joined) ? "waiting_dependency"
      : /verification|acceptance|main_agent_summary/.test(joined) ? "verifying"
        : rows.some(event => event.eventType === "requirement_plan") ? "planning"
          : rows.some(event => event.eventType.startsWith("tool_") || event.eventType.startsWith("agent_") || event.eventType === "assistant_progress") ? "executing"
            : "thinking";
  return { state, generation, terminal: false, showThinking: state === "thinking", eventId: latest?.eventId || "", contentStored: false };
}

export function projectUnifiedAgentTurnStates(events: UserVisibleAgentEvent[]) {
  const grouped = new Map<string, UserVisibleAgentEvent[]>();
  for (const event of events || []) {
    const key = String(event.anchorMessageId || "");
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) || []), event]);
  }
  return Object.fromEntries([...grouped.entries()].map(([anchorMessageId, rows]) => [anchorMessageId, projectUnifiedAgentTurnState(rows)]));
}
