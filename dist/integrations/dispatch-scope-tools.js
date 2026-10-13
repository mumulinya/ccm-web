"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchScopeTools = void 0;
exports.callBoundDispatchScopeDecision = callBoundDispatchScopeDecision;
exports.requestBoundDispatchScope = requestBoundDispatchScope;
exports.assertBoundDispatchControl = assertBoundDispatchControl;
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const agent_run_store_1 = require("../agents/agent-run-store");
const dispatch_scope_service_1 = require("../agents/dispatch-scope-service");
const db_1 = require("../core/db");
const agent_run_lifecycle_1 = require("../agents/agent-run-lifecycle");
exports.dispatchScopeTools = [{ name: "request_scope_expansion", description: "申请当前签名绑定任务的保护路径或严格档位推荐范围扩展。工具等待人工决定；返回 approved 之前不得执行所申请动作。禁止路径不可批准。", roles: ["project-agent", "project-child-agent"], inputSchema: { type: "object", required: ["requestedPaths", "reason", "idempotencyKey", "contractRevision"], properties: { requestedPaths: { type: "array", minItems: 1, maxItems: 40, items: { type: "string" } }, reason: { type: "string" }, impactSummary: { type: "string" }, idempotencyKey: { type: "string" }, contractRevision: { type: "integer", minimum: 1 } }, additionalProperties: false } }];
exports.dispatchScopeTools.push({ name: "list_scope_expansions", description: "查询当前任务的范围申请；仅授权主 Agent 可使用。", roles: ["project-agent", "group-main-agent"], inputSchema: { type: "object", additionalProperties: false } }, { name: "decide_scope_expansion", description: "主 Agent 决定当前任务的范围申请；不能批准禁止路径、旧 Attempt 或旧合同。第三方执行 Agent 不能自行批准。", roles: ["project-agent", "group-main-agent"], inputSchema: { type: "object", required: ["requestId", "decision", "contractRevision", "idempotencyKey"], properties: { requestId: { type: "string" }, decision: { enum: ["approve", "reject"] }, contractRevision: { type: "integer", minimum: 1 }, idempotencyKey: { type: "string" } }, additionalProperties: false } });
function authorizedMainTask(context) {
    const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
    const run = boundRun(context);
    const authorized = context.role === "group-main-agent" && run.agentId === "group-main-agent" && run.source === "group-main-agent"
        || context.role === "project-agent" && run.agentId === "project-main-agent" && run.source === "project-main-agent";
    if (!authorized || run.traceId !== task.trace_id || !["running", "waiting_input", "waiting_confirmation"].includes(run.status) || !run.leaseId || Date.parse(run.leaseExpiresAt || "") <= Date.now())
        throw Object.assign(new Error("范围决定需要权威主 Agent Run 绑定，子 Agent 不得自批"), { code: "CCM_SCOPE_DECISION_FORBIDDEN" });
    return task;
}
async function callBoundDispatchScopeDecision(context, name, args) {
    const task = authorizedMainTask(context);
    if (name === "list_scope_expansions")
        return { requests: task.scope_expansion_requests || [] };
    if (name !== "decide_scope_expansion" || !["approve", "reject"].includes(args?.decision))
        throw new Error("范围决定无效");
    const request = (task.scope_expansion_requests || []).find(row => row.id === args.requestId);
    if (!request)
        throw new Error("当前任务中没有此申请");
    const { updateTask } = require("../modules/collaboration/collaboration-task-service");
    return (0, dispatch_scope_service_1.mutateDispatchScope)({ readTask: id => (0, db_1.loadTasks)().find(row => row.id === id), updateTask,
        continueRun: (run, approved) => require("../agents/agent-execution-coordinator").continueApprovedDispatchScope(run.runId, approved.id),
    }, task.id, request.workItemId, args.decision, args, `mcp:${context.role}:${context.taskAgentSessionId}`);
}
function boundRun(context) {
    (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId: context.taskId }).filter(run => !(0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status) && context.taskAgentSessionId && run.taskAgentSessionId === context.taskAgentSessionId);
    if (runs.length !== 1)
        throw new Error("当前签名会话没有唯一活跃 Run");
    return runs[0];
}
async function requestBoundDispatchScope(context, args) {
    // Load the business service after tool registration; it also imports the
    // internal MCP catalogue through the task executor.
    const { updateTask } = require("../modules/collaboration/collaboration-task-service");
    if (!["project-agent", "project-child-agent"].includes(context.role))
        throw new Error("当前角色不能申请开发范围");
    const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context), run = boundRun(context);
    const itemId = (0, agent_run_store_1.listAgentRunEvents)(run.runId).find(event => event.eventType === "execution.work_item_bound")?.payload?.workItemId || (task.work_items?.length === 1 ? task.work_items[0].id : "");
    if (!itemId)
        throw new Error("当前 Run 缺少工作项绑定");
    const result = await (0, dispatch_scope_service_1.mutateDispatchScope)({ readTask: id => (0, db_1.loadTasks)().find(row => row.id === id), updateTask, continuationChannel: "mcp_tool" }, task.id, itemId, "request", { ...args, runId: run.runId, traceId: run.traceId, attemptId: run.attemptId }, `mcp:${context.role}:${context.taskAgentSessionId}`);
    while (true) {
        const latest = (0, db_1.loadTasks)().find(row => row.id === task.id);
        const request = latest?.scope_expansion_requests?.find(row => row.id === result.request.id);
        const current = (0, agent_run_store_1.getAgentRun)(run.runId);
        if (!current || (0, agent_run_lifecycle_1.isAgentRunTerminal)(current.status) || latest?.status === "cancelled")
            return { status: "blocked", reason: "original_run_stopped", requestId: result.request.id };
        if (["paused", "recovery_required"].includes(current.status))
            return { status: "blocked", reason: "original_run_requires_recovery", requestId: result.request.id };
        if (request?.status === "approved" && request.applicationState === "applied") {
            if (request.taskAttempt !== Number(latest.execution_attempt || latest.attempt || 1))
                throw new Error("批准属于旧 Attempt");
            if ((latest.scope_expansion_requests || []).some(row => row.runId === run.runId && (row.status === "pending" || row.applicationState === "applying"))) {
                await new Promise(resolve => setTimeout(resolve, 250));
                continue;
            }
            require("../agents/agent-execution-coordinator").markPersistentAgentExecutionStarted(run.runId, current.leaseId);
            return { status: "approved", requestId: request.id, requestedPaths: request.requestedPaths, contractRevision: request.appliedRevision, runId: run.runId };
        }
        if (request?.status === "pending" && Date.parse(request.expiresAt || "") <= Date.now())
            await (0, dispatch_scope_service_1.mutateDispatchScope)({ readTask: id => (0, db_1.loadTasks)().find(row => row.id === id), updateTask }, task.id, itemId, "expire", { requestId: request.id, idempotencyKey: `scope-expire:${request.id}` }, `mcp:${context.role}:${context.taskAgentSessionId}`);
        if (!request || ["rejected", "expired"].includes(request.status) || Date.parse(request.expiresAt || "") <= Date.now())
            return { status: request?.status === "rejected" ? "rejected" : "expired", requestId: result.request.id };
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}
function assertBoundDispatchControl(context) {
    const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
    if (!task.dispatch_profile_snapshot || !context.taskAgentSessionId)
        return;
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).filter(run => run.taskAgentSessionId === context.taskAgentSessionId && !(0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status));
    if (runs.some(run => ["waiting_input", "waiting_confirmation", "paused", "recovery_required"].includes(run.status)))
        throw Object.assign(new Error("任务正在等待范围批准或恢复，禁止新工作区动作"), { code: "CCM_DISPATCH_CONTROL_BLOCKED" });
}
//# sourceMappingURL=dispatch-scope-tools.js.map