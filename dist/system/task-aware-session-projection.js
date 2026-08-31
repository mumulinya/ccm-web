"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTaskAwareSessionProjection = buildTaskAwareSessionProjection;
function buildTaskAwareSessionProjection(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const index = input.sessionTaskIndex;
    const currentTaskId = String(input.currentTaskId || "").trim();
    if (!index || !currentTaskId)
        return { messages, currentTaskMessageIds: [], priorTaskMessageIds: [], priorTaskSummaries: [] };
    const priorTaskMessageIds = new Set(index.events.filter(event => event.taskId && event.taskId !== currentTaskId && ["user_message", "assistant_message"].includes(event.type)).map(event => String(event.payloadRef || "")).filter(Boolean));
    const currentTaskMessageIds = new Set(index.events.filter(event => event.taskId === currentTaskId && ["user_message", "assistant_message"].includes(event.type)).map(event => String(event.payloadRef || "")).filter(Boolean));
    // Messages not explicitly marked as a prior task remain in the current
    // session projection. This preserves ordinary conversation around the task
    // while ensuring a prior task cannot silently replace the active task.
    const projected = messages.filter(message => !priorTaskMessageIds.has(String(message?.id || message?.messageId || "")));
    return {
        messages: projected,
        currentTaskMessageIds: [...currentTaskMessageIds],
        priorTaskMessageIds: [...priorTaskMessageIds],
        priorTaskSummaries: index.taskSpans.filter(span => span.taskId !== currentTaskId).map(span => ({ taskId: span.taskId, status: span.status, startSequence: span.startSequence, endSequence: span.endSequence, checksum: span.checksum, contentStored: false })),
    };
}
//# sourceMappingURL=task-aware-session-projection.js.map