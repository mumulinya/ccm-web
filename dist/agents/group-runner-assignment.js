"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGroupRunnerAssignment = validateGroupRunnerAssignment;
const agent_communication_v2_1 = require("../system/agent-communication-v2");
/** The signed runtime snapshot binds a worker to a real group assignment.
 * Group membership or a client supplied project name is not authorization. */
function validateGroupRunnerAssignment(task, identity) {
    const binding = identity?.communicationBinding;
    if (!task?.group_id || identity.groupId !== task.group_id || !binding?.messageId)
        return false;
    const message = (0, agent_communication_v2_1.getAgentCommunication)(String(binding.messageId), { includeEvents: false, includeReceipts: false });
    return !!message && message.messageType === "task_dispatch" && message.taskId === task.id
        && message.scope === "group" && message.scopeId === task.group_id
        && message.exactSessionId === identity.exactSessionId && message.receiverAgentId === identity.projectName
        && Number(message.generation) === Number(binding.generation)
        && Number(message.attempt) === Number(binding.attempt)
        && !!message.leaseId && message.leaseId === binding.leaseId
        && ["lease_acquired", "runner_started", "acknowledged", "executing", "waiting_dependency"].includes(message.state);
}
//# sourceMappingURL=group-runner-assignment.js.map