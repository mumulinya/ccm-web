"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProjectSessionDispatch = runProjectSessionDispatch;
const project_session_agent_binding_1 = require("./project-session-agent-binding");
/** 占用跟随后台执行结束，不能绑定 HTTP close/finish（页面断开后任务仍可能运行）。 */
async function runProjectSessionDispatch(lease, onReleased, execute) {
    let released = false;
    const release = () => {
        if (released || !lease.scopeId)
            return;
        released = true;
        // 晚到的旧执行只能释放自己的租约，不能影响后续请求。
        if ((0, project_session_agent_binding_1.releaseProjectSessionAgentDispatch)(lease.scopeId, lease.leaseId || ""))
            onReleased();
    };
    try {
        return await execute(release);
    }
    finally {
        release();
    }
}
//# sourceMappingURL=project-session-dispatch-lifetime.js.map