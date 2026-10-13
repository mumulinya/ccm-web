"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDispatchProjection = buildDispatchProjection;
const dispatch_profile_1 = require("./dispatch-profile");
function buildDispatchProjection(task, executions = []) {
    if (!task)
        return {};
    let snapshot;
    try {
        snapshot = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    }
    catch {
        return { dispatch_profile: null, dispatch_diagnostic: "派发快照损坏，等待对账" };
    }
    const max = (0, dispatch_profile_1.reworkLimitForDispatchProfile)(snapshot.profile);
    const used = Math.max(0, Number(task.rework_round || 0));
    const workspace = [...executions].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))).find(row => row.workspace?.mode)?.workspace || task.execution_workspace || task.workspace || {};
    return {
        dispatch_profile: snapshot.profile, profile_reason: snapshot.reasons, required_gates: { ...snapshot.requiredGates, requireHumanApproval: snapshot.requiredGates.requireHumanApproval || ["confirm_before_write", "confirm_before_delivery"].includes(task.workflow_policy_snapshot?.approval) },
        verification_mode: task.workflow_policy_snapshot?.verification || task.task_spec?.execution_policy?.verification || snapshot.requiredGates.verification,
        worktree_mode: workspace.mode || "unobserved",
        scope_expansion_state: (task.scope_expansion_requests || []).map((r) => ({ requestId: r.id, workItemId: r.workItemId, runId: r.runId, status: r.status, applicationState: r.applicationState, requestedPaths: r.requestedPaths || [r.path], contractRevision: r.contractRevision, appliedRevision: r.appliedRevision, expiresAt: r.expiresAt, reason: r.reason, impactSummary: r.impactSummary })),
        delivery_approvals: Object.values(task.dispatch_delivery_approvals || {}).map((row) => ({ approvalId: row.approvalId, runId: row.runId, status: row.status, actionFingerprint: row.actionFingerprint, changedFiles: row.changedFiles || [] })),
        rework_round: used, rework_max_rounds: max, rework_remaining_rounds: Math.max(0, max - used),
        dispatch_diagnostic: task.rework_exhausted?.reason || "",
    };
}
//# sourceMappingURL=dispatch-projection.js.map