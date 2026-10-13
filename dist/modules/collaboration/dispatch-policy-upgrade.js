"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareDispatchPolicyUpgrade = prepareDispatchPolicyUpgrade;
exports.auditDispatchPolicyUpgrade = auditDispatchPolicyUpgrade;
const dispatch_execution_policy_1 = require("../../agents/dispatch-execution-policy");
const dispatch_profile_1 = require("../../agents/dispatch-profile");
const task_workflow_model_1 = require("./task-workflow-model");
const task_acceptance_policy_1 = require("./task-acceptance-policy");
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
function prepareDispatchPolicyUpgrade(task, updates) {
    const current = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    const requested = updates.dispatch_profile || updates.dispatchProfile;
    // Client-supplied snapshots never become authoritative, even with a profile.
    if (updates.dispatch_profile_snapshot && updates.dispatch_profile_snapshot.checksum !== current.checksum)
        throw new Error("任务派发快照不可直接修改");
    if (!requested || requested === current.profile) {
        if (updates.workflow_policy_snapshot && JSON.stringify(updates.workflow_policy_snapshot) !== JSON.stringify(task.workflow_policy_snapshot))
            throw new Error("执行策略已冻结，请通过档位升级服务变更");
        (0, dispatch_execution_policy_1.assertDispatchExecutionPolicy)({ ...task, ...updates });
        return null;
    }
    const rank = { light: 1, standard: 2, strict: 3 };
    if (!rank[requested] || rank[requested] < rank[current.profile])
        throw new Error("任务派发档位只能升级，不能降低");
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id });
    const liveProcesses = require("../../agents/execution-kernel").listActiveAgentRuns({ taskId: task.id });
    if (liveProcesses.length || runs.some(run => ["leased", "starting", "running", "recovering"].includes(run.status)))
        throw Object.assign(new Error("先安全停止当前 Runtime，再升级派发档位"), { code: "CCM_DISPATCH_UPGRADE_ACTIVE" });
    const snapshot = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)({ ...task, dispatch_profile: requested, dispatch_profile_snapshot: null, task_spec: null });
    const policy = (0, task_workflow_model_1.resolveTaskExecutionPolicy)({ ...task, workflow_policy_snapshot: null, automation_definition: null, task_spec: null, dispatch_profile_snapshot: snapshot });
    const acceptance = (0, task_acceptance_policy_1.buildTaskAcceptancePolicySnapshot)({ ...task, dispatch_profile_snapshot: snapshot });
    return { dispatch_profile: snapshot.profile, dispatch_profile_snapshot: snapshot,
        workflow_policy_snapshot: policy, rework_max_rounds: (0, dispatch_profile_1.reworkLimitForDispatchProfile)(snapshot.profile),
        ...(task.task_spec ? { task_spec: (0, task_workflow_model_1.upgradeTaskSpecDispatchProfile)(task.task_spec, snapshot, policy) } : {}),
        ...(acceptance ? { acceptance_policy_snapshot: acceptance, acceptance_mode: acceptance.mode, test_agent_enabled: acceptance.test_agent_enabled, acceptance_level: acceptance.level, acceptance_route: acceptance.route, acceptance_reasons: acceptance.reasons } : {}),
    };
}
function auditDispatchPolicyUpgrade(task, previous) {
    const key = `dispatch-upgrade:${task.id}:${task.dispatch_profile_snapshot.checksum}`;
    const payload = { from: previous.dispatch_profile_snapshot.profile, to: task.dispatch_profile_snapshot.profile, revision: task.task_spec?.revision, reason: task.dispatch_profile_snapshot.reasons };
    (0, agent_governance_store_1.recordAgentActivity)({ taskId: task.id, traceId: task.trace_id, actorType: "system", actorId: "dispatch-policy-service", eventType: "dispatch.profile_upgraded", summary: "派发档位及执行、验收策略已升级", payload, idempotencyKey: key });
    for (const run of (0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).filter(run => !["succeeded", "failed", "cancelled"].includes(run.status)))
        (0, agent_run_store_1.appendAgentRunEvent)(run.runId, { eventType: "dispatch.profile_upgraded", payload, idempotencyKey: key });
}
//# sourceMappingURL=dispatch-policy-upgrade.js.map