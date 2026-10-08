"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentGovernanceProjection = buildAgentGovernanceProjection;
const agent_run_store_1 = require("./agent-run-store");
const agent_heartbeat_coordinator_1 = require("./agent-heartbeat-coordinator");
const agent_run_consistency_1 = require("./agent-run-consistency");
const agent_governance_store_1 = require("./agent-governance-store");
const text = (value) => String(value ?? "").trim();
/** Compact governance state used by existing task, group and global runtime cards. */
function buildAgentGovernanceProjection(task) {
    const taskId = text(task?.id || task?.task_id);
    if (!taskId)
        return null;
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId, limit: 100 });
    const activeRunId = text(task?.active_run_id || task?.activeRunId || task?.run_id || task?.task_run?.run_id)
        || text(runs.find(run => !["succeeded", "failed", "cancelled", "recovery_required"].includes(run.status))?.runId);
    const run = activeRunId ? (0, agent_run_store_1.getAgentRun)(activeRunId) : runs[0] || null;
    const heartbeats = (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId, limit: 100 });
    const wake = run ? heartbeats.find(item => item.runId === run.runId || item.coalescedRunId === run.runId) : heartbeats[0];
    const artifacts = run ? (0, agent_governance_store_1.listAgentRunArtifacts)(run.runId) : (0, agent_governance_store_1.listAgentRunArtifacts)("", taskId);
    const approvals = run ? (0, agent_governance_store_1.listAgentApprovals)(run.runId) : [];
    const context = run ? (0, agent_governance_store_1.getLatestAgentHeartbeatContext)(run.runId) : null;
    return {
        run_id: run?.runId || "",
        run_status: run?.status || "",
        runtime_id: run?.runtimeId || "",
        run_started_at: run?.startedAt || "",
        run_finished_at: run?.finishedAt || "",
        run_recovery_state: ["recovery_required", "recovering"].includes(String(run?.status || "")) ? run?.status : "",
        heartbeat_wake_id: wake?.wakeId || "",
        heartbeat_status: wake?.status || "",
        heartbeat_coalesced: wake?.status === "coalesced" || wake?.coalescedRunId === run?.runId,
        activity: (0, agent_governance_store_1.listAgentActivity)({ taskId, runId: run?.runId, limit: 12 }).map(item => ({ eventType: item.eventType, summary: item.summary, actorType: item.actorType, createdAt: item.createdAt })),
        pending_approvals: approvals.filter(item => item.status === "pending"),
        budget_state: run ? (0, agent_governance_store_1.listAgentBudgetIncidents)(run.runId).slice(0, 8) : [],
        checkout_state: run ? (0, agent_governance_store_1.getAgentTaskCheckout)(taskId, run.runId) : null,
        context_reuse: context ? { mode: context.reuseMode, cursor: context.contextCursor, delta_checksum: context.contextDeltaChecksum, input_tokens: context.promptInputTokens, output_tokens: context.promptOutputTokens } : null,
        artifact_summary: { count: artifacts.length, kinds: Array.from(new Set(artifacts.map(item => item.kind))) },
        dependency_state: (0, agent_governance_store_1.listAgentTaskDependencies)(taskId).map(item => ({ dependencyId: item.dependencyId, taskId: item.taskId, dependsOnTaskId: item.dependsOnTaskId, relation: item.relation, status: item.status })),
        secret_binding_state: run ? (0, agent_governance_store_1.listAgentRunSecrets)(run.runId).map(item => ({ envName: item.envName, scope: item.scope, status: item.status })) : [],
        consistency: (0, agent_run_consistency_1.buildTaskRunConsistencyProjection)(task),
    };
}
//# sourceMappingURL=agent-governance-projection.js.map