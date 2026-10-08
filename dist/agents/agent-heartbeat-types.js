"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEARTBEAT_WAKE_STATUSES = exports.HEARTBEAT_WAKE_REASONS = void 0;
exports.normalizeHeartbeatReason = normalizeHeartbeatReason;
exports.HEARTBEAT_WAKE_REASONS = [
    "timer", "assignment", "comment", "on_demand", "automation", "approval", "resume", "retry",
];
exports.HEARTBEAT_WAKE_STATUSES = [
    "queued", "coalesced", "claimed", "completed", "failed", "cancelled",
];
function normalizeHeartbeatReason(value) {
    const normalized = String(value || "on_demand").trim().toLowerCase();
    return exports.HEARTBEAT_WAKE_REASONS.includes(normalized)
        ? normalized
        : "on_demand";
}
//# sourceMappingURL=agent-heartbeat-types.js.map