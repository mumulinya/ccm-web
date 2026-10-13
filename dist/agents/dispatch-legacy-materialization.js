"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materializeLegacyDispatchPolicy = materializeLegacyDispatchPolicy;
const dispatch_profile_1 = require("./dispatch-profile");
const dispatch_execution_policy_1 = require("./dispatch-execution-policy");
const task_workflow_model_1 = require("../modules/collaboration/task-workflow-model");
const task_acceptance_policy_1 = require("../modules/collaboration/task-acceptance-policy");
const crypto_1 = require("crypto");
/** Called on demand before a new execution; terminal history is untouched. */
function materializeLegacyDispatchPolicy(task) {
    if (!task || task.dispatch_profile_snapshot || ["done", "completed", "cancelled"].includes(task.status))
        return task;
    const previous = task.workflow_policy_snapshot || task.task_spec?.execution_policy;
    const preserveIndependent = previous?.verification === "test_agent" || task.requires_independent_review === true || task.test_agent_enabled === true;
    const snapshot = (0, dispatch_profile_1.buildDispatchProfileSnapshot)({ ...task, ...(preserveIndependent ? { dispatch_profile: "strict" } : {}) });
    const derived = (0, task_workflow_model_1.resolveTaskExecutionPolicy)({ ...task, workflow_policy_snapshot: null, task_spec: null, dispatch_profile_snapshot: snapshot });
    const { checksum: _checksum, ...policyCore } = (0, dispatch_execution_policy_1.applyDispatchExecutionPolicy)({ ...derived, ...(previous || {}) }, snapshot);
    const policy = { ...policyCore, checksum: (0, crypto_1.createHash)("sha256").update(JSON.stringify(policyCore)).digest("hex") };
    const coreTask = { ...task, dispatch_profile: snapshot.profile, dispatch_profile_snapshot: snapshot, workflow_policy_snapshot: policy };
    const spec = (0, task_workflow_model_1.buildTaskSpecV1)({ ...coreTask, task_spec_revision: Math.max(1, Number(task.task_spec?.revision || 0) + 1) }, policy);
    const acceptance = (0, task_acceptance_policy_1.buildTaskAcceptancePolicySnapshot)(coreTask);
    return require("../modules/collaboration/collaboration-task-service").updateTask(task.id, { dispatch_profile: snapshot.profile, dispatch_profile_snapshot: snapshot, dispatch_scope: (0, dispatch_profile_1.resolveDispatchScope)(task), workflow_policy_snapshot: policy, task_spec: spec, ...(acceptance ? { acceptance_policy_snapshot: acceptance, acceptance_mode: acceptance.mode, test_agent_enabled: acceptance.test_agent_enabled, acceptance_route: acceptance.route } : {}) });
}
//# sourceMappingURL=dispatch-legacy-materialization.js.map