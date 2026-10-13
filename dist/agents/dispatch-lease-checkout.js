"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureClaimedRunCheckout = ensureClaimedRunCheckout;
const agent_governance_store_1 = require("./agent-governance-store");
const dispatch_workspace_policy_1 = require("./dispatch-workspace-policy");
/** Called inside the same transaction as the lease claim. A resumed Run must
 * recover its physical lane before the transaction can authorize a launch. */
function ensureClaimedRunCheckout(db, run, ttlMs) {
    const binding = (0, dispatch_workspace_policy_1.dispatchCheckoutWorkspace)(run);
    const workspacePath = binding.workspacePath ? (0, dispatch_workspace_policy_1.canonicalDispatchWorkspace)(binding.workspacePath) : "";
    const worktreeId = binding.worktreeId || "";
    const current = db.prepare("SELECT * FROM agent_task_checkouts WHERE run_id = ? AND status = 'active'").all(run.runId);
    if (current.length) {
        if (current.length !== 1 || current[0].workspace_path !== workspacePath || current[0].worktree_id !== worktreeId
            || current[0].owner_id !== run.leaseOwnerId || current[0].lease_id !== run.leaseId) {
            throw Object.assign(new Error("Run Checkout 与当前工作区或租约不一致，禁止启动"), { code: "CCM_DISPATCH_CHECKOUT_MISMATCH" });
        }
        return;
    }
    const acquired = (0, agent_governance_store_1.acquireAgentTaskCheckoutInTransaction)(db, {
        taskId: run.taskId, runId: run.runId, traceId: run.traceId,
        workspacePath, worktreeId, ownerId: run.leaseOwnerId, leaseId: run.leaseId, ttlMs,
        idempotencyKey: `run-checkout-lease:${run.runId}:${run.leaseId}`,
        exclusiveWorkspace: (0, dispatch_workspace_policy_1.requiresExclusiveDispatchWorkspace)(run),
    });
    if (!acquired.acquired) {
        // Throwing rolls back both the new lease and its events. An occupied lane
        // cannot leave a seemingly valid replacement lease behind.
        throw Object.assign(new Error("恢复执行无法取得任务或工作区 Checkout"), {
            code: "CCM_DISPATCH_CHECKOUT_HELD", reason: acquired.reason,
        });
    }
}
//# sourceMappingURL=dispatch-lease-checkout.js.map