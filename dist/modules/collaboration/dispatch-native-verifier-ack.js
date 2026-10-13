"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeNativeVerifierAssignment = acknowledgeNativeVerifierAssignment;
const crypto_1 = require("crypto");
const task_store_1 = require("../../core/task-store");
const agent_communication_v2_1 = require("../../system/agent-communication-v2");
/** The built-in read-only verifier is the assignment receiver. Confirm its
 * handoff before launching its CLI, never infer an ACK from a later result.
 * Developer assignments still require their own signed MCP acknowledgement. */
function acknowledgeNativeVerifierAssignment(input) {
    if (!input.envelope?.messageId)
        return null; // Communication V2 disabled.
    return (0, task_store_1.withSqliteTaskStore)(db => db.transaction(() => {
        const expected = input.envelope;
        const current = (0, agent_communication_v2_1.getAgentCommunication)(expected.messageId);
        if (!current || current.payload?.verificationOnly !== true
            || current.messageType !== "task_dispatch" || current.scope !== "group"
            || current.taskId !== input.taskId || current.scopeId !== input.groupId
            || current.receiverAgentId !== input.targetName || !input.handoff?.id
            || !input.handoff?.projects?.length || !input.handoff?.acceptanceCriteria?.length) {
            throw new Error("原生验收 ACK 缺少有效的只读工作单绑定");
        }
        for (const key of ["taskId", "workItemId", "exactSessionId", "generation", "attempt", "leaseId", "senderAgentId", "receiverAgentId"]) {
            if (String(current[key] ?? "") !== String(expected[key] ?? ""))
                throw new Error(`原生验收 ACK 身份已失效：${key}`);
        }
        const lease = db.prepare("SELECT * FROM agent_communication_leases WHERE message_id=?").get(current.messageId);
        if (!lease || lease.lease_id !== current.leaseId || lease.status !== "active" || Date.parse(lease.expires_at) <= Date.now()) {
            throw new Error("原生验收 ACK 租约已失效");
        }
        if (!["runner_starting", "runner_started", "acknowledged", "executing"].includes(current.state)) {
            throw new Error(`原生验收不能重复启动：${current.state}`);
        }
        if (current.state === "runner_starting")
            (0, agent_communication_v2_1.markAgentCommunicationRunnerStarted)(current.messageId, { runnerKind: "native_test_agent", summary: "原生独立验收已领取只读交接单" });
        if (["acknowledged", "executing"].includes(current.state))
            return { accepted: true, deduplicated: true };
        const binding = current.payload.semanticBinding || {};
        const result = (0, agent_communication_v2_1.recordAgentCommunicationReceipt)(current.messageId, "dispatch_ack", {
            ...expected, senderAgentId: expected.receiverAgentId, receiverAgentId: expected.senderAgentId,
        }, {
            understoodGoal: "按冻结验收标准独立检查交付，不转派开发、不修改被验收源码",
            summary: `原生 TestAgent 接受交接单 ${input.handoff.id}`,
            requirementChecksum: binding.requirementChecksum,
            planChecksum: binding.planChecksum,
            stepId: binding.stepId, stepIds: binding.stepIds,
            acceptanceCriterionIds: binding.acceptanceCriterionIds,
            plannedScope: input.handoff.projects.map((project) => String(project.name || project.id || "")),
            forbiddenScope: ["修改被验收源码", "转派开发任务"],
            verificationPlan: [(0, crypto_1.createHash)("sha256").update(JSON.stringify(input.handoff)).digest("hex")],
        });
        if (!result.accepted)
            throw new Error(`原生验收 ACK 被拒绝：${result.issues.join(",")}`);
        return result;
    })());
}
//# sourceMappingURL=dispatch-native-verifier-ack.js.map