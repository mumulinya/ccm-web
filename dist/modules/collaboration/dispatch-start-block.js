"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preserveDispatchStartBlock = preserveDispatchStartBlock;
const db_1 = require("../../core/db");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
const credential_store_1 = require("../../core/credential-store");
const agent_run_store_1 = require("../../agents/agent-run-store");
/** A denied safety gate is waiting for a decision, not a failed Provider call. */
function preserveDispatchStartBlock(taskId, error, parentRunId = "") {
    if (!String(error?.code || "").startsWith("CCM_DISPATCH_") && !["CCM_RUN_APPROVAL_PENDING", "CCM_SCOPE_APPROVAL_PENDING", "CCM_TASK_DEPENDENCY_BLOCKED"].includes(error?.code))
        return null;
    const current = (0, db_1.loadTasks)().find(row => row.id === taskId);
    if (!current?.dispatch_profile_snapshot)
        return null;
    const summary = (0, credential_store_1.redactSensitiveText)(String(error.message || "派发门禁等待处理")).slice(0, 500);
    const task = require("./collaboration-task-service").updateTask(taskId, { status: "blocked",
        acceptance_state: error.code === "CCM_DISPATCH_PLAN_CONFIRMATION_REQUIRED" ? "awaiting_plan_confirmation" : "needs_user",
        auto_execute: false, status_detail: summary });
    const run = parentRunId && (0, agent_run_store_1.getAgentRun)(parentRunId);
    if (run && ["running", "starting"].includes(run.status))
        (0, agent_run_store_1.transitionAgentRun)(run.runId, "waiting_confirmation", summary);
    (0, agent_governance_store_1.recordAgentActivity)({ taskId, traceId: task.trace_id, eventType: "dispatch.start_blocked", actorType: "system", actorId: "dispatch-coordinator",
        summary, payload: { reason: error.code, contentStored: false }, idempotencyKey: `dispatch-block:${taskId}:${task.execution_attempt || 1}:${error.code}:${error.permissionRequestId || ""}` });
    return { task, status: "blocked", summary, verification: [], risks: [], fileChanges: null };
}
//# sourceMappingURL=dispatch-start-block.js.map