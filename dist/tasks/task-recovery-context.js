"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectTaskRecoveryContext = inspectTaskRecoveryContext;
const session_contamination_detector_1 = require("../agents/session-contamination-detector");
const task_context_1 = require("./task-context");
const session_task_timeline_1 = require("./session-task-timeline");
/** Read-only. Never create an anchor at the current head: that hides prior contamination. */
function inspectTaskRecoveryContext(task) {
    const blocked = (reason) => ({ status: "blocked", reason, events: [], eventCount: 0, contentStored: false });
    // taskTimelineIdentity resolves the current CCM conversation, including an
    // earlier recovery conversation. Native provider IDs are never used here.
    const identity = (0, task_context_1.taskTimelineIdentity)(task);
    const context = task?.task_context;
    if (!context?.checksum || !identity.exactSessionId || !identity.scopeId)
        return blocked("recovery_anchor_missing");
    if (["drifted", "locked", "incomplete"].includes(context.status))
        return blocked("task_context_invalid");
    if (context.scope !== identity.scope || context.scopeId !== identity.scopeId || Number(context.generation) !== Number(task.generation || 0)) {
        return { ...blocked("task_scope_or_generation_changed"), status: "state_changed" };
    }
    try {
        const integrity = (0, session_task_timeline_1.verifySessionTimelineChain)(identity);
        if (!integrity.valid)
            return blocked("timeline_integrity_failed");
        const index = (0, session_task_timeline_1.readSessionTaskIndex)(identity);
        const span = index.taskSpans.find(row => row.taskId === task.id);
        const attempt = span?.attemptSpans.find(row => row.attempt === Number(task.execution_attempt || task.attempt || context.latestAttempt));
        if (!span || !attempt)
            return blocked("recovery_attempt_anchor_missing");
        // Immutable start boundary covers the whole attempt. Late status messages
        // cannot move it past intervening unrelated user questions.
        const start = index.events.find(row => row.sequence === attempt.startSequence && row.taskId === task.id);
        if (!start || !["task_started", "task_attempt_started"].includes(start.type))
            return blocked("recovery_anchor_invalid");
        const anchor = {
            taskId: task.id, conversationSessionId: identity.exactSessionId, contextRevision: Number(context.revision),
            lastIncludedMessageId: start.eventId, lastIncludedMessageSequence: start.sequence,
            taskContextChecksum: context.checksum, executionSessionId: identity.exactSessionId,
            generation: Number(task.generation || 0), attempt: attempt.attempt, capturedAt: start.timestamp,
        };
        const result = (0, session_contamination_detector_1.detectTaskContextContamination)(anchor, index.events.map(row => ({ conversationSessionId: row.exactSessionId,
            taskId: row.taskId, sequence: row.sequence, messageKind: row.type, createdAt: row.timestamp })));
        return { ...result, anchor, headSequence: index.latestSequence };
    }
    catch {
        return blocked("timeline_unavailable");
    }
}
//# sourceMappingURL=task-recovery-context.js.map