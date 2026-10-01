"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAuthoritativeExecutionState = readAuthoritativeExecutionState;
exports.transitionAuthoritativeExecutionState = transitionAuthoritativeExecutionState;
/** Small authoritative-state facade used by task lifecycle integrations. */
const execution_session_registry_1 = require("./execution-session-registry");
function readAuthoritativeExecutionState(executionSessionId) {
    const session = (0, execution_session_registry_1.getExecutionSession)(executionSessionId);
    return session ? { executionSessionId: session.id, taskId: session.taskId, workItemId: session.workItemId, generation: session.generation, status: session.status, updatedAt: session.updatedAt, contentStored: false } : null;
}
function transitionAuthoritativeExecutionState(executionSessionId, status) {
    const session = (0, execution_session_registry_1.transitionExecutionSession)(executionSessionId, status);
    return { executionSessionId: session.id, taskId: session.taskId, workItemId: session.workItemId, generation: session.generation, status: session.status, updatedAt: session.updatedAt, contentStored: false };
}
//# sourceMappingURL=task-authoritative-state.js.map