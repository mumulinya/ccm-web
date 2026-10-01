"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectQueuedTurnRequest = projectQueuedTurnRequest;
function projectQueuedTurnRequest(turn, identity, files) {
    return {
        project: identity.resourceId, session_id: identity.sessionId,
        message: turn.message, files,
        client_message_id: String(turn.metadata?.original_message_id || turn.request_id || ""),
        assistant_message_id: `project-reply:${turn.id}`,
        parent_run_id: turn.metadata?.parent_run_id || turn.metadata?.continuation_task_id || "",
        conversation_turn_id: turn.id,
        discussion_task_id: turn.task_id || turn.metadata?.discussion_task_id || "",
        new_topic: turn.metadata?.new_topic === true,
        resolved_route: turn.metadata?.resolved_route || "",
        resolved_candidate_task_id: turn.metadata?.resolved_candidate_task_id || "",
        clarification_payload: turn.metadata?.clarification_payload || null,
        source: "web",
    };
}
//# sourceMappingURL=project-queued-turn-request.js.map