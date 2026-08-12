"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectUnifiedAgentTurnState = projectUnifiedAgentTurnState;
exports.projectUnifiedAgentTurnStates = projectUnifiedAgentTurnStates;
function generationRows(events) {
    const generation = events.reduce((max, event) => Math.max(max, Number(event.generation || 0)), 0);
    return { generation, rows: events.filter(event => !generation || Number(event.generation || 0) === generation) };
}
function projectUnifiedAgentTurnState(events) {
    const ordered = [...(events || [])].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
    const { generation, rows } = generationRows(ordered);
    const latestResult = [...rows].reverse().find(event => event.eventType === "result");
    if (latestResult) {
        const status = String(latestResult.display?.status || latestResult.detail?.result?.status || "").toLowerCase();
        const state = /cancel/.test(status) ? "cancelled"
            : /interrupt|pause|waiting/.test(status) ? "interrupted"
                : /fail|error|blocked/.test(status) ? "failed" : "completed";
        return { state, generation, terminal: true, showThinking: false, eventId: latestResult.eventId, contentStored: false };
    }
    const latest = rows[rows.length - 1];
    const joined = rows.map(event => `${event.eventType} ${event.display?.status || ""} ${event.detail?.executionStage?.kind || ""} ${event.detail?.agentDisplay?.phase || ""}`).join(" ").toLowerCase();
    const state = /permission_required|waiting_confirmation|blocked/.test(joined) ? "waiting_user"
        : /waiting_dependency|queued_dependency/.test(joined) ? "waiting_dependency"
            : /verification|acceptance|main_agent_summary/.test(joined) ? "verifying"
                : rows.some(event => event.eventType === "requirement_plan") ? "planning"
                    : rows.some(event => event.eventType.startsWith("tool_") || event.eventType.startsWith("agent_") || event.eventType === "assistant_progress") ? "executing"
                        : "thinking";
    return { state, generation, terminal: false, showThinking: state === "thinking", eventId: latest?.eventId || "", contentStored: false };
}
function projectUnifiedAgentTurnStates(events) {
    const grouped = new Map();
    for (const event of events || []) {
        const key = String(event.anchorMessageId || "");
        if (!key)
            continue;
        grouped.set(key, [...(grouped.get(key) || []), event]);
    }
    return Object.fromEntries([...grouped.entries()].map(([anchorMessageId, rows]) => [anchorMessageId, projectUnifiedAgentTurnState(rows)]));
}
//# sourceMappingURL=unified-agent-turn-state.js.map