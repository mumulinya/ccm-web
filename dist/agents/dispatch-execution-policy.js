"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDispatchExecutionPolicy = applyDispatchExecutionPolicy;
exports.assertDispatchExecutionPolicy = assertDispatchExecutionPolicy;
const crypto_1 = require("crypto");
const dispatch_profile_1 = require("./dispatch-profile");
/** Apply the persisted profile without weakening an explicit permission gate. */
function applyDispatchExecutionPolicy(policy, snapshot) {
    if (!(0, dispatch_profile_1.validateDispatchProfileSnapshot)(snapshot).valid)
        throw new Error("CCM_DISPATCH_SNAPSHOT_INVALID");
    if (snapshot.profile === "strict")
        return { ...policy, dispatch: "orchestrated", verification: "test_agent", workspace: "isolated_worktree", approval: policy.approval === "confirm_before_write" ? policy.approval : "confirm_before_delivery" };
    if (snapshot.profile === "light")
        return { ...policy, dispatch: "direct_worker", verification: "quick_check", workspace: policy.workspace === "isolated_worktree" ? policy.workspace : "shared_serial" };
    return { ...policy, verification: policy.verification === "test_agent" ? "test_agent" : "main_agent_self" };
}
function assertDispatchExecutionPolicy(task) {
    const mismatch = () => Object.assign(new Error("CCM_DISPATCH_POLICY_MISMATCH：派发快照与实际执行策略不一致"), { code: "CCM_DISPATCH_POLICY_MISMATCH" });
    const snapshot = task?.dispatch_profile_snapshot || task?.task_spec?.dispatch_profile_snapshot;
    if (!snapshot)
        return;
    const policy = task.workflow_policy_snapshot || task.task_spec?.execution_policy;
    if (task.task_spec?.dispatch_profile_snapshot && task.task_spec.dispatch_profile_snapshot.checksum !== snapshot.checksum)
        throw mismatch();
    if (policy?.checksum) {
        const { checksum, ...core } = policy;
        if ((0, crypto_1.createHash)("sha256").update(JSON.stringify(core)).digest("hex") !== checksum)
            throw mismatch();
    }
    if (task.task_spec?.execution_policy && policy && (0, dispatch_profile_1.dispatchProfileChecksum)(task.task_spec.execution_policy) !== (0, dispatch_profile_1.dispatchProfileChecksum)(policy))
        throw mismatch();
    const expected = applyDispatchExecutionPolicy(policy || {}, snapshot);
    if (!policy || ["dispatch", "verification", "workspace", "approval"].some(key => expected[key] !== policy[key])) {
        throw Object.assign(new Error("派发档位与执行策略不一致，需对账后继续"), { code: "CCM_DISPATCH_POLICY_MISMATCH" });
    }
}
//# sourceMappingURL=dispatch-execution-policy.js.map