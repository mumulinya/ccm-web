"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAgentRunTerminal = isAgentRunTerminal;
exports.canTransitionAgentRun = canTransitionAgentRun;
exports.assertAgentRunTransition = assertAgentRunTransition;
exports.listAgentRunTransitions = listAgentRunTransitions;
const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);
const TRANSITIONS = {
    created: new Set(["queued", "leased", "starting", "recovery_required", "failed", "cancelled"]),
    queued: new Set(["leased", "starting", "paused", "recovery_required", "failed", "cancelled"]),
    leased: new Set(["starting", "running", "recovery_required", "failed", "cancelled"]),
    starting: new Set(["running", "waiting_confirmation", "waiting_input", "paused", "recovery_required", "failed", "cancelled"]),
    running: new Set(["waiting_confirmation", "waiting_input", "paused", "recovery_required", "succeeded", "failed", "cancelled"]),
    waiting_confirmation: new Set(["queued", "running", "paused", "failed", "cancelled"]),
    waiting_input: new Set(["queued", "running", "paused", "failed", "cancelled"]),
    paused: new Set(["queued", "leased", "recovering", "failed", "cancelled"]),
    recovery_required: new Set(["recovering", "queued", "failed", "cancelled"]),
    recovering: new Set(["running", "waiting_input", "paused", "recovery_required", "succeeded", "failed", "cancelled"]),
    succeeded: new Set(),
    failed: new Set(),
    cancelled: new Set(),
};
function isAgentRunTerminal(status) {
    return TERMINAL.has(status);
}
function canTransitionAgentRun(from, to) {
    const source = String(from || "");
    const target = String(to || "");
    if (source === target)
        return true;
    return TRANSITIONS[source]?.has(target) === true;
}
function assertAgentRunTransition(from, to) {
    if (!canTransitionAgentRun(from, to)) {
        throw new Error(`AgentRun 非法状态迁移：${String(from || "unknown")} -> ${String(to || "unknown")}`);
    }
}
function listAgentRunTransitions() {
    return Object.fromEntries(Object.entries(TRANSITIONS).map(([key, values]) => [key, [...values]]));
}
//# sourceMappingURL=agent-run-lifecycle.js.map