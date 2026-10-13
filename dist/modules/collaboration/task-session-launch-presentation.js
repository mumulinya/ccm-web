"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishTaskSessionLaunch = publishTaskSessionLaunch;
const agent_sessions_1 = require("../../tasks/agent-sessions");
/** Present the checked launch binding rather than inferring resume from a turn counter. */
function publishTaskSessionLaunch(input) {
    const session = input.session;
    if (!session)
        return;
    const resumed = (0, agent_sessions_1.getTaskAgentSessionOptions)(session).resumeSession === true
        && (!input.task?.task_session_continuation_context || session.taskSessionContinuation?.mode === "native_reused");
    const state = resumed ? "恢复原生会话" : "创建原生会话";
    const reason = session.taskSessionContinuation?.reason || "";
    input.addTaskLog(input.taskId, "info", `${input.targetName} ${state}（${session.agentType}，第 ${session.turnCount + 1} 轮）${!resumed && reason ? `；${reason}` : ""}`);
    input.appendTaskTimelineEvent(input.taskId, {
        type: resumed ? "native_session_resume" : "native_session_open", title: `${input.targetName} ${state}`,
        detail: `${session.agentType} / ${resumed ? "native_reused" : "fresh_session"}${reason ? ` / ${reason}` : ""}`,
        status: "active", phase: "executing", agent: input.targetName,
        data: { sessionRecordId: session.id, nativeSessionId: session.nativeSessionId, turn: session.turnCount + 1 },
    });
    input.writeSse(input.streamRes, { type: "native_session", taskId: input.taskId, agent: input.targetName,
        session: { project: input.targetName, agentType: session.agentType, mode: resumed ? "native" : "fresh", turn: session.turnCount + 1, resumed } });
    if (input.task)
        input.updateInline(input.task, "in_progress", `${input.targetName} ${state}`);
}
//# sourceMappingURL=task-session-launch-presentation.js.map