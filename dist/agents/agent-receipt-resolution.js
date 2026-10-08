"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAgentRunFromReceipt = resolveAgentRunFromReceipt;
const agent_run_store_1 = require("./agent-run-store");
function text(value) { return String(value ?? "").trim(); }
function identityMatches(run, receipt) {
    const fields = [
        ["trace_id", text(receipt?.traceId || receipt?.trace_id), run.traceId],
        ["task_id", text(receipt?.taskId || receipt?.task_id), run.taskId],
        ["attempt_id", text(receipt?.attemptId || receipt?.attempt_id), run.attemptId],
    ];
    return fields.filter(([, supplied]) => supplied).every(([, supplied, stored]) => supplied === stored);
}
function ambiguous(candidates, reason) {
    for (const run of candidates) {
        (0, agent_run_store_1.appendAgentRunEvent)(run.runId, {
            eventType: "run_identity_ambiguous",
            status: run.status,
            message: "外部回执无法唯一绑定到 AgentRun",
            payload: { reason, candidateCount: candidates.length },
            idempotencyKey: `receipt-ambiguous:${run.runId}:${reason}:${candidates.length}`,
        });
    }
    return { status: "ambiguous", run: null, candidates, matchedBy: "none", reason };
}
function resolveAgentRunFromReceipt(receipt) {
    const runId = text(receipt?.runId || receipt?.run_id || receipt?.agentRunId || receipt?.agent_run_id);
    const executionId = text(receipt?.executionId || receipt?.execution_id);
    const sessionId = text(receipt?.taskAgentSessionId || receipt?.task_agent_session_id);
    const attemptId = text(receipt?.attemptId || receipt?.attempt_id);
    const taskId = text(receipt?.taskId || receipt?.task_id);
    if (runId) {
        const run = (0, agent_run_store_1.getAgentRun)(runId);
        if (!run)
            return { status: "not_found", run: null, candidates: [], matchedBy: "run_id", reason: "run_not_found" };
        if (!identityMatches(run, receipt))
            return { status: "identity_mismatch", run: null, candidates: [run], matchedBy: "run_id", reason: "run_identity_mismatch" };
        return { status: "resolved", run, candidates: [run], matchedBy: "run_id" };
    }
    if (executionId) {
        const candidates = (0, agent_run_store_1.listAgentRuns)({ executionId, limit: 100 });
        if (candidates.length === 1 && identityMatches(candidates[0], receipt))
            return { status: "resolved", run: candidates[0], candidates, matchedBy: "execution_id" };
        if (candidates.length === 1)
            return { status: "identity_mismatch", run: null, candidates, matchedBy: "execution_id", reason: "execution_identity_mismatch" };
        if (candidates.length > 1)
            return ambiguous(candidates, "execution_id_multiple_runs");
    }
    if (sessionId && attemptId) {
        const candidates = (0, agent_run_store_1.listAgentRuns)({ taskId, limit: 500 }).filter(run => run.taskAgentSessionId === sessionId && run.attemptId === attemptId);
        if (candidates.length === 1 && identityMatches(candidates[0], receipt))
            return { status: "resolved", run: candidates[0], candidates, matchedBy: "session_attempt" };
        if (candidates.length === 1)
            return { status: "identity_mismatch", run: null, candidates, matchedBy: "session_attempt", reason: "session_attempt_identity_mismatch" };
        if (candidates.length > 1)
            return ambiguous(candidates, "session_attempt_multiple_runs");
    }
    if (taskId) {
        const candidates = (0, agent_run_store_1.listAgentRuns)({ taskId, limit: 500 });
        if (candidates.length === 1 && identityMatches(candidates[0], receipt))
            return { status: "resolved", run: candidates[0], candidates, matchedBy: "task_id" };
        if (candidates.length === 1)
            return { status: "identity_mismatch", run: null, candidates, matchedBy: "task_id", reason: "task_identity_mismatch" };
        if (candidates.length > 1)
            return ambiguous(candidates, "legacy_task_id_multiple_runs");
    }
    return { status: "not_found", run: null, candidates: [], matchedBy: "none", reason: "receipt_identity_missing" };
}
//# sourceMappingURL=agent-receipt-resolution.js.map