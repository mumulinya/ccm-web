"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSessionRuntimeBindings = taskSessionRuntimeBindings;
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
/** Reference authoritative records; never copy Provider transcripts or secrets. */
function taskSessionRuntimeBindings(taskId) {
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId, limit: 500 });
    const sessions = (0, agent_sessions_1.listTaskAgentSessions)({ taskId });
    return sessions.map(session => {
        const related = runs.filter(run => run.taskAgentSessionId === session.id);
        return {
            task_agent_session_id: session.id,
            runtime_id: session.agentType,
            native_session_id: session.nativeSessionId || "",
            native_session_history: session.nativeSessionHistory || [],
            resume_mode: session.resumeMode,
            continuity_mode: session.continuityMode || "fresh",
            status: session.status,
            continuation: session.taskSessionContinuation || null,
            role: related.length && related.every(run => run.scope === "test_agent" || run.agentId === "test-agent") ? "test_agent" : related.length ? "developer" : "unverified",
            run_ids: related.map(run => run.runId),
            execution_history_limited: runs.length === 500,
            executions: related.map(run => ({ run_id: run.runId, agent_id: run.agentId, attempt_id: run.attemptId,
                role: run.scope === "test_agent" || run.agentId === "test-agent" ? "test_agent" : "developer", native_session_id: run.nativeSessionId || "",
                parent_run_id: run.parentRunId || "", status: run.status, runtime_version: run.runtimeVersionSnapshot || null,
                workspace_path: run.workspacePath || "", worktree_id: run.worktreeId || "", workspace_evidence: run.workspaceEvidence || null,
                context: (0, agent_governance_store_1.getLatestAgentHeartbeatContext)(run.runId) })),
            native_evidence_available: !!session.nativeResumeEvidenceRef,
        };
    });
}
//# sourceMappingURL=task-session-runtime-bindings.js.map