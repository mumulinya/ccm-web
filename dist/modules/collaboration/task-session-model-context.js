"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePrivateTaskGroupMemory = validatePrivateTaskGroupMemory;
exports.buildPrivateTaskModelContext = buildPrivateTaskModelContext;
const db_1 = require("../../core/db");
const task_session_store_1 = require("./task-session-store");
const session_model_context_1 = require("../../system/session-model-context");
const task_session_boundary_1 = require("./task-session-boundary");
const task_session_model_history_1 = require("./task-session-model-history");
const context_budget_1 = require("../../system/context-budget");
function validatePrivateTaskGroupMemory(groupId, options) {
    const sessionId = String(options.groupSessionId || options.group_session_id || "");
    if (!(0, task_session_boundary_1.isPrivateTaskSessionId)(sessionId))
        return false;
    buildPrivateTaskModelContext("group", groupId, sessionId, String(options.taskId || options.task_id || options.task?.id || ""));
    return true;
}
/** Private execution identities read the task's archive, never an active chat fallback. */
function buildPrivateTaskModelContext(scope, scopeId, exactSessionId, taskId) {
    const task = (0, db_1.getTaskById)(String(taskId || ""));
    const binding = task?.execution_session_binding_snapshot;
    if (!task || binding?.scope !== scope || binding.scopeId !== scopeId || binding.exactSessionId !== exactSessionId) {
        throw new Error("内部任务上下文身份与权威任务绑定不一致");
    }
    const session = (0, task_session_store_1.getTaskSession)(task.id);
    if (!session)
        throw new Error("内部任务上下文尚未持久化，禁止使用其他聊天代替");
    const archived = session.messages.filter(row => row.role !== "system_context").map(row => ({ ...row, id: row.message_id }));
    const history = (0, task_session_model_history_1.projectTaskSessionModelHistory)(archived);
    const messages = history.messages;
    const projection = (0, session_model_context_1.buildUnifiedSessionModelContextProjection)({ scope, scopeId, sessionId: exactSessionId,
        messages, executionEvents: [], currentTaskId: task.id, consumeSessionStartHookContext: false });
    const lookup = { task_id: task.id, endpoint: `/api/task-sessions/${task.id}/messages` };
    const rendered = history.state.complete ? projection.rendered :
        `任务历史模型窗口（原始记录未删除；不是模型总结，未展开的内容不能声称已读取）：${JSON.stringify({ ...history.state, history_lookup: lookup })}\n`
            + projection.rendered.replace("压缩前完整会话原文", "任务历史模型窗口");
    return { ...projection, rendered, renderedTokens: (0, context_budget_1.estimateTextTokens)(rendered), modelHistoryState: history.state,
        taskProjection: { ...projection.taskProjection, currentTaskFullTimeline: history.state.complete },
        schema: "ccm-task-session-model-context-v1", groupId: scope === "group" ? scopeId : "",
        groupSessionId: exactSessionId, sourceMessages: messages, totalMessageCount: archived.length, visibleMessageIds: messages.map(row => row.id), taskId: task.id };
}
//# sourceMappingURL=task-session-model-context.js.map