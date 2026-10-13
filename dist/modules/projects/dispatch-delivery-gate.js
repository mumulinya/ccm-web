"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awaitDispatchDeliveryApproval = awaitDispatchDeliveryApproval;
exports.recordDispatchDeliveryApplied = recordDispatchDeliveryApplied;
const crypto_1 = require("crypto");
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
const db_1 = require("../../core/db");
const collaboration_task_service_1 = require("../collaboration/collaboration-task-service");
const dispatch_profile_1 = require("../../agents/dispatch-profile");
/** Authorization covers immutable commits and the receiving HEAD. A decision
 * never authorizes a changed branch or starts another Provider process. */
async function awaitDispatchDeliveryApproval(input) {
    if (!input.taskId)
        return null; // Historical callers without a persistent task.
    const task = (0, db_1.loadTasks)().find((row) => row.id === input.taskId);
    if (!task)
        throw new Error("交付任务不存在");
    const profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    const taskScope = (0, dispatch_profile_1.resolveDispatchScope)(task);
    const workItem = (task.work_items || []).find((item) => item.id === input.workItemId);
    const scope = { ...taskScope, recommendedPaths: [...new Set([...taskScope.recommendedPaths, ...(workItem?.dispatchContract?.files || [])])], forbiddenPaths: [...new Set([...taskScope.forbiddenPaths, ...(workItem?.dispatchContract?.forbiddenPaths || [])])] };
    const invalid = input.changedFiles.filter(file => !(0, dispatch_profile_1.evaluateDispatchPath)(file, scope, profile.profile, input.workspacePath).allowed);
    if (invalid.length)
        throw Object.assign(new Error(`交付范围尚未获准：${invalid.join("、")}`), { code: "CCM_DISPATCH_DELIVERY_SCOPE_BLOCKED" });
    if (profile.profile !== "strict" && task.workflow_policy_snapshot?.approval !== "confirm_before_delivery")
        return null;
    const run = (0, agent_run_store_1.getAgentRun)(String(task.agent_run_id || task.run_id || ""));
    if (!run || run.taskId !== task.id || run.traceId !== task.trace_id || !["running", "waiting_confirmation"].includes(run.status))
        throw Object.assign(new Error("严格交付缺少可等待审批的主 Run，已保留隔离分支"), { code: "CCM_DISPATCH_DELIVERY_RUN_REQUIRED" });
    const fingerprint = (0, crypto_1.createHash)("sha256").update(JSON.stringify({ taskId: task.id, runId: run.runId, attemptId: run.attemptId, workItemId: input.workItemId, branch: input.branch, baseCommit: input.baseCommit, commit: input.commit, mainHead: input.mainHead, changedFiles: [...input.changedFiles].sort() })).digest("hex");
    const approval = (0, agent_governance_store_1.createAgentApproval)({ taskId: task.id, runId: run.runId, traceId: run.traceId, actionType: "project_worktree_merge", actionFingerprint: fingerprint, requestedBy: "project-main-agent", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), idempotencyKey: `dispatch-merge:${fingerprint}`, payload: { workItemId: input.workItemId, branch: input.branch, commit: input.commit, baseCommit: input.baseCommit, mainHead: input.mainHead, changedFiles: input.changedFiles } });
    const persist = (status) => {
        const latest = (0, db_1.loadTasks)().find((row) => row.id === task.id);
        (0, collaboration_task_service_1.updateTask)(task.id, { dispatch_delivery_approvals: { ...(latest?.dispatch_delivery_approvals || {}), [input.workItemId]: { approvalId: approval.approvalId, runId: run.runId, actionFingerprint: fingerprint, status, branch: input.branch, workspacePath: input.workspacePath, baseCommit: input.baseCommit, commit: input.commit, mainHead: input.mainHead, changedFiles: input.changedFiles } }, ...(status === "pending" ? { acceptance_state: "waiting_confirmation", status_detail: "隔离分支交付等待人工批准，尚未合并" } : {}) });
    };
    persist(approval.status);
    while (true) {
        const latest = (0, db_1.loadTasks)().find((row) => row.id === task.id);
        if (!latest || latest.status === "cancelled" || latest.cancellation_requested_at || ["failed", "cancelled", "recovery_required"].includes((0, agent_run_store_1.getAgentRun)(run.runId)?.status))
            throw Object.assign(new Error("交付已停止，隔离分支保留"), { code: "CCM_DISPATCH_DELIVERY_CANCELLED" });
        const approvals = (0, agent_governance_store_1.listAgentApprovals)(run.runId);
        const current = approvals.find(row => row.approvalId === approval.approvalId);
        if (current?.status === "approved") {
            if (approvals.some(row => ["rejected", "expired", "cancelled"].includes(row.status)))
                throw Object.assign(new Error("同一 Run 仍有未获有效批准的动作，禁止交付"), { code: "CCM_DISPATCH_DELIVERY_APPROVAL_BLOCKED" });
            if (approvals.some(row => row.status === "pending") || (latest.scope_expansion_requests || []).some(row => row.runId === run.runId && (row.status !== "approved" || row.applicationState !== "applied"))) {
                await new Promise(resolve => setTimeout(resolve, input.pollMs || 500));
                continue;
            }
            persist("approved");
            return { approvalId: approval.approvalId, fingerprint, runId: run.runId, taskId: task.id, workItemId: input.workItemId };
        }
        if (!current || current.status !== "pending") {
            persist(current?.status || "blocked");
            throw Object.assign(new Error(`交付审批${current?.status === "expired" ? "已过期" : "未通过"}，隔离分支保留`), { code: "CCM_DISPATCH_DELIVERY_APPROVAL_BLOCKED" });
        }
        await new Promise(resolve => setTimeout(resolve, input.pollMs || 500));
    }
}
function recordDispatchDeliveryApplied(authorization, commit) {
    if (!authorization)
        return;
    const task = (0, db_1.loadTasks)().find((row) => row.id === authorization.taskId);
    const delivery = task?.dispatch_delivery_approvals?.[authorization.workItemId];
    if (!delivery || delivery.actionFingerprint !== authorization.fingerprint || delivery.commit !== commit)
        throw new Error("交付动作指纹发生变化");
    (0, collaboration_task_service_1.updateTask)(task.id, { dispatch_delivery_approvals: { ...task.dispatch_delivery_approvals, [authorization.workItemId]: { ...delivery, status: "applied" } } });
    const key = `dispatch-merge-applied:${authorization.approvalId}`;
    const payload = { approvalId: authorization.approvalId, actionFingerprint: authorization.fingerprint, commit };
    (0, agent_run_store_1.appendAgentRunEvent)(authorization.runId, { eventType: "dispatch.delivery_applied", idempotencyKey: key, payload });
    (0, agent_governance_store_1.recordAgentActivity)({ taskId: task.id, runId: authorization.runId, traceId: task.trace_id, actorType: "system", actorId: "project-delivery", eventType: "dispatch.delivery_applied", summary: "已应用获批的隔离分支交付", payload, idempotencyKey: key });
    const run = (0, agent_run_store_1.getAgentRun)(authorization.runId);
    if (run?.status === "waiting_confirmation")
        (0, agent_run_store_1.transitionAgentRun)(run.runId, "running", "获批交付已应用，继续独立验收");
}
//# sourceMappingURL=dispatch-delivery-gate.js.map