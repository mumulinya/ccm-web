"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareTaskIntakeSessionBinding = prepareTaskIntakeSessionBinding;
exports.prepareTaskExecutionSession = prepareTaskExecutionSession;
const task_session_boundary_1 = require("./task-session-boundary");
const crypto_1 = require("crypto");
/** A task without a chat origin uses a stable private execution identity. */
function prepareTaskIntakeSessionBinding(task) {
    const groupId = String(task.group_id || task.groupId || "").trim();
    const projectId = String(task.target_project || task.targetProject || "").trim();
    const source = task.source_conversation_ref || task.sourceConversationRef || null;
    const groupSession = String(task.group_session_id || task.groupSessionId || (source?.scope === "group" && String(source.scopeId || source.scope_id) === groupId ? source.exactSessionId : "") || "").trim();
    const projectSession = String(task.project_session_id || task.projectSessionId || (source?.scope === "project" && String(source.scopeId || source.scope_id) === projectId ? source.exactSessionId : "") || "").trim();
    const seed = { groupId, projectId, request: task.idempotency_key || task.idempotencyKey || task.client_message_id || task.clientMessageId || task.automation_occurrence_id || "", source, title: task.title || "", description: task.description || "" };
    const privateId = `task_session_${(0, crypto_1.createHash)("sha256").update(JSON.stringify(seed)).digest("hex").slice(0, 32)}`;
    const sourceIsExecutionTarget = source && (groupId ? source.scope === "group" && String(source.scopeId || source.scope_id) === groupId
        : projectId && projectId !== "global-agent" ? source.scope === "project" && String(source.scopeId || source.scope_id) === projectId : source.scope === "global");
    const suppliedExact = String(task.exact_session_id || task.exactSessionId || "").trim();
    // Definition targets may retain a legacy chat id. Only a scoped source or
    // explicit scoped session binds execution to that chat; otherwise each
    // occurrence owns its private identity. Never mix the two in the snapshot.
    const scopedSession = groupId ? groupSession : projectId && projectId !== "global-agent" ? projectSession : "";
    if (scopedSession && suppliedExact && suppliedExact !== scopedSession) {
        throw Object.assign(new Error("任务执行会话与精确身份冲突"), { code: "TASK_EXECUTION_SESSION_CONFLICT", status: 409 });
    }
    const exact = scopedSession || (sourceIsExecutionTarget ? String(source.exactSessionId || "") : "")
        || (!groupId && (!projectId || projectId === "global-agent") ? suppliedExact : "") || privateId;
    const origin = source || (groupSession && !(0, task_session_boundary_1.isPrivateTaskSessionId)(groupSession) ? { scope: "group", scopeId: groupId, exactSessionId: groupSession, messageId: task.message_id || task.client_message_id || "" }
        : projectSession && !(0, task_session_boundary_1.isPrivateTaskSessionId)(projectSession) ? { scope: "project", scopeId: projectId, exactSessionId: projectSession, messageId: task.message_id || task.client_message_id || "" } : null);
    return { taskGroupId: groupId, requestedProject: projectId, taskGroupSessionId: groupId ? groupSession || privateId : "",
        taskProjectSessionId: !groupId && projectId && projectId !== "global-agent" ? projectSession || privateId : "",
        sourceConversationRef: origin,
        targetConversationRef: task.target_conversation_ref || task.targetConversationRef || (groupSession && !(0, task_session_boundary_1.isPrivateTaskSessionId)(groupSession) ? { scope: "group", scopeId: groupId, exactSessionId: groupSession }
            : projectSession && !(0, task_session_boundary_1.isPrivateTaskSessionId)(projectSession) ? { scope: "project", scopeId: projectId, exactSessionId: projectSession } : null),
        exactSessionId: exact };
}
/** Planning/backlog resolution must not create a public conversation. */
function prepareTaskExecutionSession(input) {
    const key = (0, crypto_1.createHash)("sha256").update(JSON.stringify({ scope: input.scope, scopeId: input.scopeId,
        source: input.source, requestId: input.requestId || "", title: input.title || "" })).digest("hex");
    return { created: false, snapshot: { schema: "ccm-task-execution-session-v1", scope: input.scope,
            scopeId: input.scopeId, exactSessionId: `task_session_${key.slice(0, 32)}`, resolution: "task_owned",
            bindingChecksum: key } };
}
//# sourceMappingURL=task-intake-session-binding.js.map