"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertExtensionProxyTaskBinding = assertExtensionProxyTaskBinding;
const agent_sessions_1 = require("../tasks/agent-sessions");
const agent_communication_mcp_1 = require("../integrations/agent-communication-mcp");
const agent_communication_v2_1 = require("../system/agent-communication-v2");
const extension_runtime_bindings_1 = require("./extension-runtime-bindings");
function assertExtensionProxyTaskBinding(context, task, sessions) {
    if (["cancelled", "completed", "done", "failed", "archived"].includes(task.status)
        || (context.groupId && task.group_id !== context.groupId)
        || (context.groupSessionId && task.group_session_id !== context.groupSessionId)
        || (context.projectSessionId && task.project_session_id !== context.projectSessionId))
        throw new Error("扩展代理任务绑定已失效");
    if (context.communicationMessageId) {
        const message = (0, agent_communication_v2_1.getAgentCommunication)(context.communicationMessageId, { includeEvents: false, includeReceipts: false });
        if (!message)
            throw new Error("扩展代理协作绑定已失效");
        (0, agent_communication_mcp_1.assertAgentCommunicationMcpBinding)(context, message, context.communicationMessageId);
    }
    else if (String(task.target_project || task.project || "") !== context.project)
        throw new Error("扩展代理项目绑定已失效");
    const session = (sessions || (0, agent_sessions_1.listTaskAgentSessions)({ taskId: context.taskId, project: context.project }))
        .find(row => row.id === context.taskAgentSessionId);
    if (!session || session.status !== "open" || (context.nativeSessionId && session.nativeSessionId !== context.nativeSessionId)
        || (context.groupSessionId && session.groupSessionId !== context.groupSessionId))
        throw new Error("扩展代理原生会话已换代或关闭");
    if (!sessions)
        (0, extension_runtime_bindings_1.assertExtensionRuntimeGeneration)(context);
    return true;
}
//# sourceMappingURL=extension-proxy-authorization.js.map