"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRecoverySessionRecord = buildRecoverySessionRecord;
exports.projectTaskRecoverySessions = projectTaskRecoverySessions;
const crypto_1 = require("crypto");
function buildRecoverySessionRecord(task, userSession, transaction, activation, action = "resume") {
    const anchor = userSession.contamination?.anchor;
    if (!anchor)
        throw new Error("恢复执行缺少已验证的任务锚点");
    return {
        id: `recovery_${(0, crypto_1.createHash)("sha256").update(transaction.transactionId).digest("hex").slice(0, 24)}`,
        taskId: task.id,
        workItemIds: (task.work_items || []).filter((row) => row.completed !== true).map((row) => row.id || row.workItemId).filter(Boolean),
        sourceExecutionSessionId: anchor.executionSessionId, sourceConversationSessionId: anchor.conversationSessionId,
        conversationSessionId: userSession.activeSessionId, recoveryReason: userSession.reason, action,
        sourceContextRevision: anchor.contextRevision, sourceContextChecksum: anchor.taskContextChecksum,
        generation: Number(task.generation || 0), attempt: transaction.nextAttempt, transactionId: transaction.transactionId,
        agentSessionIds: activation.sessions.map((row) => row.id), replacedAgentSessionIds: activation.replacedSessionIds || [],
        anchor, createdAt: transaction.startedAt, contentStored: false,
    };
}
/** Status is derived from authoritative attempt spans; workers cannot mark recovery completed. */
function projectTaskRecoverySessions(task) {
    return (Array.isArray(task?.recovery_sessions) ? task.recovery_sessions : []).filter((row) => row.taskId === task.id).map((row) => {
        const span = (task.task_context?.timelineSpans || []).find((item) => item.exactSessionId === row.conversationSessionId && item.taskId === row.taskId);
        const attempt = span?.attemptSpans?.find((item) => item.attempt === row.attempt);
        const latest = Number(task.execution_attempt || 0) === row.attempt;
        const rolledBack = task.recovery_transaction?.transactionId === row.transactionId && task.recovery_transaction?.status === "rolled_back";
        const terminal = { success: "completed", failed: "failed", blocked: "blocked", interrupted: "blocked", cancelled: "cancelled" };
        const status = rolledBack ? "blocked" : terminal[attempt?.status] || (latest
            ? ({ pending: "created", queued: "created", executing: "running", in_progress: "running", running: "running", verifying: "verifying", reviewing: "verifying", repairing: "running", blocked: "blocked", failed: "failed", cancelled: "cancelled", done: "completed", completed: "completed" }[task.status] || "blocked") : "blocked");
        return { id: row.id, taskId: row.taskId, workItemIds: row.workItemIds, conversationSessionId: row.conversationSessionId,
            sourceConversationSessionId: row.sourceConversationSessionId, recoveryReason: row.recoveryReason, action: row.action,
            attempt: row.attempt, generation: row.generation, status, createdAt: row.createdAt,
            sourceContextRevision: row.sourceContextRevision, sourceContextChecksum: row.sourceContextChecksum,
            agentSessionIds: row.agentSessionIds, replacedAgentSessionIds: row.replacedAgentSessionIds, contentStored: false };
    });
}
//# sourceMappingURL=task-recovery-session.js.map