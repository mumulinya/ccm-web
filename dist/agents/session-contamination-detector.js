"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectTaskContextContamination = detectTaskContextContamination;
function detectTaskContextContamination(anchor, events) {
    const result = (status, reason, rows = []) => ({
        status, reason, eventCount: rows.length, contentStored: false,
        // Never return foreign task IDs, message IDs, arbitrary metadata or text.
        events: rows.slice(0, 20).map(row => ({ sequence: row.sequence,
            messageKind: ["user_message", "assistant_message", "tool_use", "tool_result", "task_started", "task_attempt_started", "scope_changed", "permission_changed", "context_compacted"].includes(row.messageKind) ? row.messageKind : "other_event",
            createdAt: /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(row.createdAt || "") ? row.createdAt : "" })),
    });
    if (!anchor?.taskId || !anchor.conversationSessionId || !anchor.taskContextChecksum
        || !Number.isInteger(anchor.lastIncludedMessageSequence) || anchor.lastIncludedMessageSequence < 1)
        return result("blocked", "recovery_anchor_missing");
    if (!Array.isArray(events) || events.some(row => row.conversationSessionId !== anchor.conversationSessionId
        || !Number.isInteger(row.sequence) || row.sequence < 1))
        return result("blocked", "timeline_identity_invalid");
    const later = events.filter(row => row.sequence > anchor.lastIncludedMessageSequence);
    const boundaries = later.filter(row => row.stateBoundary === true || ["scope_changed", "permission_changed", "context_compacted"].includes(row.messageKind));
    if (boundaries.length)
        return result("state_changed", "session_boundary_changed", boundaries);
    const foreign = later.filter(row => row.taskId !== anchor.taskId);
    return foreign.length ? result("context_contaminated", "unrelated_session_events", foreign) : result("clean_resume", "task_events_only");
}
//# sourceMappingURL=session-contamination-detector.js.map