"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleDispatchTestAgentRun = settleDispatchTestAgentRun;
const dispatch_test_evidence_1 = require("./dispatch-test-evidence");
const agent_execution_coordinator_1 = require("./agent-execution-coordinator");
/** Used by both the live child callback and a waiter reattached after restart. */
function settleDispatchTestAgentRun(record, parsed) {
    if (!record.agentRunId)
        return;
    try {
        if (record.status === "interrupted") {
            (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(record.agentRunId, `TestAgent ${record.mode} 需要恢复`, { message: String(record.error || "").slice(0, 500) });
            return;
        }
        const status = record.status === "completed" ? "succeeded" : record.status === "cancelled" ? "cancelled" : "failed";
        (0, agent_execution_coordinator_1.finalizePersistentAgentExecution)({
            runId: record.agentRunId, leaseOwnerId: record.leaseOwnerId, status,
            error: record.error ? { message: String(record.error).slice(0, 500) } : {},
            result: { status: record.status, runnerId: record.id, testEvidence: (0, dispatch_test_evidence_1.buildDispatchTestEvidence)(parsed) },
        });
    }
    catch {
        // Artifact or persistence failures cannot leave a completed local record
        // pointing to a running authoritative Run with no recovery reason.
        record.status = "interrupted";
        record.error = "TestAgent 证据绑定或终态对账失败，需要恢复检查。";
        try {
            (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(record.agentRunId, record.error, { code: "CCM_TEST_AGENT_FINALIZATION_BLOCKED" });
        }
        catch { }
    }
}
//# sourceMappingURL=dispatch-test-agent-finalization.js.map