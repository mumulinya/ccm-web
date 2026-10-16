"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAgentVerificationIdentity = testAgentVerificationIdentity;
const agent_run_store_1 = require("../agents/agent-run-store");
/** Runner-owned environment points to the authoritative Coordinator record. */
function testAgentVerificationIdentity(taskId) {
    const runId = String(process.env.CCM_TEST_AGENT_AGENT_RUN_ID || "");
    if (!runId)
        return { status: "unknown", taskId };
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run || run.taskId !== taskId || run.scope !== "test_agent")
        return { status: "conflict", taskId };
    const leaseExpiry = Date.parse(run.leaseExpiresAt || "");
    if (!["starting", "running", "recovering"].includes(run.status) || !run.traceId || !run.attemptId
        || !run.leaseId || !Number.isFinite(leaseExpiry) || leaseExpiry <= Date.now())
        return { status: "conflict", taskId };
    return { status: "bound", taskId: run.taskId, runId: run.runId, attemptId: run.attemptId, traceId: run.traceId };
}
//# sourceMappingURL=verification-identity.js.map