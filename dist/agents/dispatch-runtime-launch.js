"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRuntimeLaunchCommand = buildRuntimeLaunchCommand;
const agent_runtime_adapter_1 = require("./agent-runtime-adapter");
const agent_run_store_1 = require("./agent-run-store");
const db_1 = require("../core/db");
const dispatch_resume_inspection_1 = require("./dispatch-resume-inspection");
/** Adapter owns command construction; the execution kernel owns process spawn.
 * A returned handle is a launch description, never evidence of a running process. */
async function buildRuntimeLaunchCommand(runtimeId, messageFile, options = {}, binding = {}) {
    const adapter = (0, agent_runtime_adapter_1.getAgentRuntimeAdapter)(runtimeId);
    const task = binding.taskId && (0, db_1.loadTasks)().find(row => row.id === binding.taskId);
    const nativeSessionId = String(options.sessionId || binding.nativeSessionId || "");
    const explicit = binding.runId ? (0, agent_run_store_1.getAgentRun)(binding.runId) : null;
    const previous = explicit || (binding.taskId && (0, agent_run_store_1.listAgentRuns)({ taskId: binding.taskId }).find(run => run.runtimeId === adapter.describe().id && run.nativeSessionId === nativeSessionId
        && (!binding.taskAgentSessionId || run.taskAgentSessionId === binding.taskAgentSessionId)));
    const context = { ...binding, ...(previous || {}), runtimeId, nativeSessionId,
        workspacePath: binding.workspacePath || previous?.workspacePath || "", messageFile, options };
    if (options.resumeSession === true && task?.dispatch_profile_snapshot) {
        if (!previous || previous.taskId !== task.id || previous.traceId !== task.trace_id)
            throw Object.assign(new Error("原生续跑缺少关联 Run 证据"), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
        const inspection = await (0, dispatch_resume_inspection_1.inspectDispatchResume)(context);
        if (!inspection.resumable)
            throw Object.assign(new Error(`原生续跑证据检查失败：${inspection.reason}`), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
    }
    const handle = options.resumeSession === true ? await adapter.resume(context) : await adapter.start(context);
    if (!handle?.command || typeof handle.command !== "string")
        throw Object.assign(new Error("命令型 Adapter 没有返回启动命令"), { code: "CCM_RUNTIME_COMMAND_MISSING" });
    return handle.command;
}
//# sourceMappingURL=dispatch-runtime-launch.js.map