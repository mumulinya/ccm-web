"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stageDispatchTaskDelivery = stageDispatchTaskDelivery;
exports.approveDispatchTaskDelivery = approveDispatchTaskDelivery;
exports.finalizeApprovedDispatchDelivery = finalizeApprovedDispatchDelivery;
exports.reconcileDispatchTaskDeliveryDecisions = reconcileDispatchTaskDeliveryDecisions;
const crypto_1 = require("crypto");
const db_1 = require("../../core/db");
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
const acceptance_contract_1 = require("../../agents/acceptance-contract");
const acceptance_ledger_1 = require("../../agents/acceptance-ledger");
const collaboration_task_service_1 = require("./collaboration-task-service");
function fingerprint(task) {
    const contract = (0, acceptance_contract_1.taskAcceptanceContract)(task);
    const ledger = contract ? (0, acceptance_ledger_1.evaluateAcceptanceLedger)(task) : null;
    if (ledger && !ledger.canComplete)
        throw new Error(`交付证据已失效：${ledger.issues.join("；")}`);
    if (task.delivery_summary?.acceptance_gate_passed !== true)
        throw new Error("交付验收尚未通过");
    return (0, crypto_1.createHash)("sha256").update(JSON.stringify({ taskId: task.id, traceId: task.trace_id, attemptId: task.attempt_id,
        generation: task.generation, contractChecksum: contract?.checksum, evidenceIds: ledger?.evidenceIds?.sort(),
        reportId: task.test_agent_review?.invocation?.invocationId,
        gate: task.delivery_summary.acceptance_gate?.checks?.map((check) => ({ id: check.id, ok: check.ok })) })).digest("hex");
}
/** Verification completion is distinct from an explicit delivery decision.
 * This approval authorizes the existing result, never another Provider call. */
function stageDispatchTaskDelivery(taskId, execution, summary) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    if (!task?.dispatch_profile_snapshot || (task.workflow_policy_snapshot?.approval !== "confirm_before_delivery"
        && !(task.task_session_boundary_version === 1 && task.source_conversation_ref && task.task_spec?.task_session_archive_policy === "user_confirm")))
        return null;
    const candidate = { ...task, delivery_summary: summary };
    const actionFingerprint = fingerprint(candidate);
    const run = (0, agent_run_store_1.listAgentRuns)({ taskId }).find(row => row.status === "succeeded" && row.traceId === task.trace_id
        && row.scope !== "test_agent" && !row.executionId.endsWith(":ack-preflight"));
    if (!run)
        throw new Error("交付确认缺少已完成的权威 Run");
    const approval = (0, agent_governance_store_1.createAgentApproval)({ taskId, runId: run.runId, traceId: task.trace_id, actionType: "task_delivery_confirmation",
        actionFingerprint, requestedBy: "group-main-agent", idempotencyKey: `task-delivery:${taskId}:${actionFingerprint}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), payload: { contractChecksum: (0, acceptance_contract_1.taskAcceptanceContract)(task)?.checksum } });
    return (0, collaboration_task_service_1.updateTask)(taskId, { status: "waiting_user", acceptance_state: "awaiting_user_acceptance", auto_execute: false,
        result: String(execution.result || execution.report || "").slice(0, 500), final_report: execution.report || execution.result || "",
        receipt: execution.receipt || task.receipt, review: execution.review || task.review,
        delivery_summary: summary, file_changes: execution.fileChanges || task.file_changes,
        status_detail: task.dispatch_profile === "strict" ? "独立验收已通过，隔离交付等待你确认；不会再次启动开发 Agent" : "任务检查已通过，等待你确认完成；不会再次启动开发 Agent",
        pending_dispatch_delivery: { approvalId: approval.approvalId, runId: run.runId, actionFingerprint },
        user_acceptance: { state: "pending", output_revision: actionFingerprint, contentStored: false } });
}
function approveDispatchTaskDelivery(task, actorId) {
    const pending = task.pending_dispatch_delivery;
    if (!pending)
        return {};
    if (!actorId || fingerprint(task) !== pending.actionFingerprint)
        throw new Error("交付版本或验收证据已变化，请重新核对");
    const approval = (0, agent_governance_store_1.listAgentApprovals)(pending.runId).find(row => row.approvalId === pending.approvalId);
    if (!approval || approval.actionType !== "task_delivery_confirmation" || approval.taskId !== task.id
        || approval.actionFingerprint !== pending.actionFingerprint)
        throw new Error("交付审批身份不匹配");
    const decided = (0, agent_governance_store_1.decideAgentApproval)(approval.approvalId, { status: "approved", decisionBy: actorId,
        actionFingerprint: pending.actionFingerprint, reason: "用户核对现有验收与隔离交付后批准" });
    if (decided.status !== "approved")
        throw new Error("交付审批已拒绝或过期");
    return { delivery_confirmation: { confirmed: true, approval_id: decided.approvalId,
            action_fingerprint: pending.actionFingerprint, actor_id: actorId }, user_acceptance: { ...task.user_acceptance, state: "approved" } };
}
/** The approved output also closes the legacy execution projection. This
 * grants merge readiness only; merging remains a separate explicit action. */
function finalizeApprovedDispatchDelivery(task) {
    if (!task?.pending_dispatch_delivery || task.delivery_confirmation?.confirmed !== true
        || !["done", "completed"].includes(task.status) || task.acceptance_state !== "accepted"
        || task.acceptance_decision?.actor !== "user" || task.acceptance_decision?.status !== "approved")
        return;
    fingerprint(task);
    require("./collaboration-runtime-coordinator-review").finalizeTaskKernel(task, {
        status: "done", receipt: task.receipt, fileChanges: task.file_changes,
    }, task.delivery_summary, "succeeded", "用户已批准现有验收交付，未重新执行 Runtime");
}
/** Repair only an already authorized, unchanged delivery after the SQLite
 * decision committed but its Task projection did not. No Runtime is replayed. */
function reconcileDispatchTaskDeliveryDecisions() {
    let repaired = 0, blocked = 0;
    for (const task of (0, db_1.loadTasks)()) {
        const pending = task.pending_dispatch_delivery;
        if (!pending || task.status !== "waiting_user" || task.acceptance_state !== "awaiting_user_acceptance")
            continue;
        const approval = (0, agent_governance_store_1.listAgentApprovals)(pending.runId).find(row => row.approvalId === pending.approvalId);
        if (!approval || approval.status !== "approved")
            continue;
        try {
            const updates = approveDispatchTaskDelivery(task, approval.decisionBy);
            const repairedTask = (0, collaboration_task_service_1.updateTask)(task.id, { ...updates, status: "completed", acceptance_state: "accepted", terminal_actor: "user",
                status_detail: "已恢复用户批准的交付记录；未重新执行 Runtime",
                acceptance_decision: { schema: "ccm-user-task-acceptance-decision-v1", actor: "user", status: "approved",
                    decided_at: approval.decidedAt, reason: approval.reason, output_revision: pending.actionFingerprint } }, { repairProjectionOnReplay: true });
            if (!["done", "completed"].includes(repairedTask?.status))
                throw new Error("交付投影未完成");
            finalizeApprovedDispatchDelivery(repairedTask);
            repaired++;
        }
        catch {
            // Evidence drift cannot turn a persisted human decision into permission
            // for a different output. Keep the task waiting for an explicit decision.
            blocked++;
        }
    }
    return { repaired, blocked };
}
//# sourceMappingURL=dispatch-task-delivery-confirmation.js.map