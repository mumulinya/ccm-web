"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindDispatchToolContinuation = bindDispatchToolContinuation;
exports.recordDispatchToolContinuationUsage = recordDispatchToolContinuationUsage;
exports.observeDispatchToolContinuation = observeDispatchToolContinuation;
const db_1 = require("../core/db");
const agent_run_store_1 = require("./agent-run-store");
const task_store_1 = require("../core/task-store");
const agent_governance_store_1 = require("./agent-governance-store");
const agent_run_workspace_1 = require("./agent-run-workspace");
const native_continuation_1 = require("./native-continuation");
const agent_sessions_1 = require("../tasks/agent-sessions");
const dispatch_native_session_evidence_1 = require("./dispatch-native-session-evidence");
/** Tool rounds retain the business identity. A synthetic task ID must not
 * remove the frozen Task's permission, scope, budget or recovery gates. */
function bindDispatchToolContinuation(input) {
    const task = (0, db_1.loadTasks)().find(row => row.id === input.taskId);
    if (!task?.dispatch_profile_snapshot)
        return null;
    const candidates = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).filter(run => run.executionId === input.executionId
        && run.traceId === task.trace_id && run.runtimeId === input.agentType);
    const parent = input.parentRunId ? (0, agent_run_store_1.getAgentRun)(input.parentRunId) : candidates.length === 1 ? candidates[0] : null;
    if (!parent || parent.taskId !== task.id || parent.traceId !== task.trace_id || parent.runtimeId !== input.agentType)
        throw Object.assign(new Error("工具续跑缺少唯一原 Run 身份"), { code: "CCM_DISPATCH_CONTINUATION_UNBOUND" });
    if (["paused", "recovery_required", "failed", "cancelled"].includes(parent.status))
        throw Object.assign(new Error("原执行不允许工具续跑，需先恢复核验"), { code: "CCM_DISPATCH_RECOVERY_REQUIRED" });
    const terminal = parent.status === "succeeded";
    if (!terminal) {
        const active = require("./execution-kernel").listActiveAgentRuns({ taskId: parent.taskId }).filter(row => row.executionId === parent.executionId);
        if (active.some(row => { try {
            if (row.pid > 0) {
                process.kill(row.pid, 0);
                return true;
            }
        }
        catch { } return false; }))
            throw Object.assign(new Error("原 Runtime 尚未退出，禁止启动工具续跑"), { code: "CCM_RUN_ALREADY_ACTIVE" });
        require("./agent-execution-coordinator").markPersistentAgentExecutionStarted(parent.runId, parent.leaseId);
    }
    return { taskId: parent.taskId, traceId: parent.traceId, attemptId: parent.attemptId, scope: parent.scope, scopeId: parent.scopeId,
        agentId: parent.agentId, runtimeId: parent.runtimeId, taskAgentSessionId: parent.taskAgentSessionId, worktreeId: parent.worktreeId,
        workspacePath: parent.workspacePath, executionId: terminal ? `${parent.executionId}:tool:${input.round}` : parent.executionId,
        agentRunId: terminal ? "" : parent.runId, parentRunId: terminal ? parent.runId : parent.parentRunId,
        leaseOwnerId: terminal ? undefined : parent.leaseOwnerId, deferAgentRunFinalization: !terminal,
        source: parent.source, idempotencyKey: `tool-continuation:${parent.runId}:${input.round}`, originalRun: parent };
}
function recordDispatchToolContinuationUsage(binding, usage, round) {
    if (!binding?.originalRun || !binding.agentRunId)
        return;
    const runId = binding.agentRunId;
    const key = `tool-usage:${runId}:${round}`;
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        if (db.prepare("SELECT event_id FROM agent_run_events WHERE idempotency_key = ?").get(key))
            return;
        const usageId = usage?.reported === true ? (0, agent_run_store_1.recordAgentRunUsage)(runId, { ...usage, costUsd: usage.costUsd ?? usage.totalCostUsd }, { provider: binding.runtimeId, provenance: "tool-continuation" }) : "";
        if (!usageId)
            (0, agent_governance_store_1.recordAgentBudgetUsageUnreported)(runId, "tool_continuation_usage_missing");
        (0, agent_run_store_1.appendAgentRunEventInTransaction)(db, runId, { eventType: "usage.recorded", payload: { usageId, round, reported: !!usageId }, idempotencyKey: key });
        return (0, agent_governance_store_1.evaluateAgentRunBudget)(runId);
    });
}
/** Called only after the previous Provider command has closed, with its
 * verified output contract. It is not a startup recovery inspection. */
async function observeDispatchToolContinuation(binding, evidence) {
    if (!binding)
        return;
    const run = binding.originalRun;
    if (!run || !(0, native_continuation_1.verifyNativeSessionContinuationEvidence)(evidence, { provider: run.runtimeId }).valid || !evidence.nativeSessionReusable)
        throw Object.assign(new Error("工具续跑缺少 Provider 原生 Session 证据"), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
    const session = (0, agent_sessions_1.listTaskAgentSessions)({ taskId: run.taskId }).find(row => row.id === run.taskAgentSessionId);
    if (!session)
        throw Object.assign(new Error("工具续跑缺少 CCM 会话绑定"), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
    const ref = (0, dispatch_native_session_evidence_1.persistDispatchNativeSessionEvidence)(evidence);
    if (!ref)
        throw Object.assign(new Error("原生 Session 证据不可持久化"), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
    if (session.nativeResumeEvidenceRef !== ref)
        (0, agent_sessions_1.recordTaskAgentSessionTurn)(session.id, { nativeSessionId: evidence.effectiveNativeSessionId, success: true, nativeContinuationEvidence: evidence });
    if (run.status !== "succeeded")
        (0, agent_run_store_1.updateAgentRunBindings)(run.runId, { nativeSessionId: evidence.effectiveNativeSessionId,
            runtimeVersionSnapshot: evidence.providerRuntimeVersionSnapshot || run.runtimeVersionSnapshot,
            workspaceEvidence: await (0, agent_run_workspace_1.captureAgentRunWorkspaceEvidence)(run) });
}
//# sourceMappingURL=dispatch-tool-continuation.js.map