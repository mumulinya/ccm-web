"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchMemoryTransportPolicy = dispatchMemoryTransportPolicy;
exports.admitDispatchMemoryTransport = admitDispatchMemoryTransport;
/** A reference to a scoped MCP snapshot is not evidence that its full memory
 * text was injected into the provider prompt. Keep the two transport claims
 * separate; the MCP server independently checks scope and read authorization. */
function dispatchMemoryTransportPolicy(memory, renderedText) {
    const reference = memory?.schema === "ccm-third-party-memory-mcp-reference-v1";
    if (reference) {
        const binding = require("../tasks/agent-sessions-shared").extractGroupSessionMemoryBinding(memory);
        if (!memory.snapshot_id || !memory.snapshot_checksum || binding?.checksumValid !== true || binding.deliveryReady === false) {
            throw Object.assign(new Error("群聊记忆 MCP 引用或身份绑定无效"), { code: "CCM_MEMORY_REFERENCE_INVALID" });
        }
    }
    return {
        renderedMemoryContext: reference ? "" : String(renderedText || ""),
        requireMemoryPromptInjectionProof: !reference,
        requireTrustedMemoryPromptEnvelope: !reference,
        requireProviderMemoryChannelAcknowledgement: !reference,
    };
}
function admitDispatchMemoryTransport(memoryBundle, options, admitPrompt) {
    const memory = options.workerContextPacket?.memory;
    if (memory?.schema !== "ccm-third-party-memory-mcp-reference-v1")
        return admitPrompt(memoryBundle, options);
    dispatchMemoryTransportPolicy(memory, "");
    const snapshot = require("../integrations/third-party-memory-snapshot").loadThirdPartyMemorySnapshot(memory.snapshot_id, memory.snapshot_checksum);
    const identity = snapshot.identity || {};
    const expectedIdentity = options.expectedIdentity || {};
    for (const field of ["groupId", "groupSessionId", "project", "taskId", "taskAgentSessionId"]) {
        const expected = expectedIdentity[field];
        if (!expected || identity[field] !== expected)
            throw Object.assign(new Error("记忆 MCP 快照不属于当前派发"), { code: "CCM_MEMORY_REFERENCE_INVALID" });
    }
    const manifest = require("../modules/collaboration/storage").listGroupChatSessions(identity.groupId);
    if (!manifest.sessions.some((session) => session.id === identity.groupSessionId && !session.archived)
        && !require("../modules/collaboration/task-memory-authority").taskOwnsGroupMemory(identity)) {
        throw Object.assign(new Error("记忆 MCP 所属会话不可派发"), { code: "CCM_MEMORY_REFERENCE_INVALID" });
    }
    // Do not create a prompt-consumption WAL or claim that MCP content was read.
    return { admitted: true, required: false, reason: "scoped_mcp_reference_available", contentDelivered: false,
        snapshotId: snapshot.id, snapshotChecksum: snapshot.checksum };
}
//# sourceMappingURL=dispatch-memory-transport-policy.js.map