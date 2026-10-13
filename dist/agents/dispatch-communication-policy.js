"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchCommunicationMcpIdentity = dispatchCommunicationMcpIdentity;
exports.communicationRequiresDispatchAck = communicationRequiresDispatchAck;
const db_1 = require("../core/db");
const dispatch_profile_1 = require("./dispatch-profile");
/** Rebuilding MCP tools for a memory budget or Runtime fallback must retain
 * the original server-issued communication fence. */
function dispatchCommunicationMcpIdentity(envelope) {
    return {
        communicationMessageId: envelope?.messageId || "",
        communicationGeneration: envelope?.generation || 0,
        communicationAttempt: envelope?.attempt || 0,
        communicationLeaseId: envelope?.leaseId || "",
    };
}
/** Only the persisted CCM task can waive the model ACK, never receipt payloads. */
function communicationRequiresDispatchAck(taskId) {
    const task = (0, db_1.loadTasks)().find((row) => row.id === taskId);
    const snapshot = task?.dispatch_profile_snapshot;
    return !((0, dispatch_profile_1.validateDispatchProfileSnapshot)(snapshot).valid && snapshot.profile === "light");
}
//# sourceMappingURL=dispatch-communication-policy.js.map