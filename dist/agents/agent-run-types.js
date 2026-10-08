"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_RUN_STATUS_VALUES = void 0;
exports.normalizeAgentRunScope = normalizeAgentRunScope;
exports.normalizeAgentRunTrigger = normalizeAgentRunTrigger;
exports.runtimeDescriptorToPublicSnapshot = runtimeDescriptorToPublicSnapshot;
exports.AGENT_RUN_STATUS_VALUES = [
    "created",
    "queued",
    "leased",
    "starting",
    "running",
    "waiting_confirmation",
    "waiting_input",
    "paused",
    "recovery_required",
    "recovering",
    "succeeded",
    "failed",
    "cancelled",
];
function normalizeAgentRunScope(value) {
    const normalized = String(value || "project").trim().toLowerCase();
    return ['project', 'group', 'global', 'test_agent', 'automation'].includes(normalized)
        ? normalized
        : "project";
}
function normalizeAgentRunTrigger(value) {
    const normalized = String(value || "user").trim().toLowerCase();
    return ['user', 'schedule', 'heartbeat', 'resume', 'retry'].includes(normalized)
        ? normalized
        : "user";
}
function runtimeDescriptorToPublicSnapshot(descriptor) {
    if (!descriptor)
        return null;
    return {
        id: descriptor.id,
        label: descriptor.label,
        commandLabel: descriptor.commandLabel,
        capabilities: { ...(descriptor.capabilities || {}) },
    };
}
//# sourceMappingURL=agent-run-types.js.map