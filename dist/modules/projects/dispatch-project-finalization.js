"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockDispatchProjectFinalization = blockDispatchProjectFinalization;
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_run_lifecycle_1 = require("../../agents/agent-run-lifecycle");
const agent_execution_coordinator_1 = require("../../agents/agent-execution-coordinator");
const collaboration_task_service_1 = require("../collaboration/collaboration-task-service");
/** A persistence/lease failure is not a verified implementation failure. Keep
 * the accepted evidence and immutable Run outcome, and require reconciliation
 * before publishing a successful delivery or replaying side effects. */
function blockDispatchProjectFinalization(taskId, runId, error) {
    if (error?.code !== "CCM_DISPATCH_FINALIZATION_BLOCKED")
        return null;
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (run && !(0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
        (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(runId, "项目终态落账未完成，需对账后处理", { code: error.code });
    const summary = "验证结果已保留，但项目终态落账未完成；需对账后处理，禁止重复执行。";
    const task = (0, collaboration_task_service_1.updateTask)(taskId, { status: "blocked", acceptance_state: "delivery_recovery_required", status_detail: summary,
        recovery_pending: true, auto_execute: false, is_paused: true, paused: true });
    return { task, status: "blocked", summary, fileChanges: task?.file_changes || { count: 0, files: [] }, verification: task?.verification || [], risks: [summary], testAgent: task?.test_agent_review || null };
}
//# sourceMappingURL=dispatch-project-finalization.js.map