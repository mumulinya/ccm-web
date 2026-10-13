"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLegacyAutomaticIntakeReplay = findLegacyAutomaticIntakeReplay;
/** Preserve old automatic binding identities only for the same explicit submission. */
function findLegacyAutomaticIntakeReplay(tasks, input, identity) {
    if (!identity || !(input.idempotency_key || input.idempotencyKey || input.client_message_id || input.clientMessageId))
        return null;
    if (input.project_session_id || input.projectSessionId || input.group_session_id || input.groupSessionId || input.exact_session_id || input.exactSessionId
        || input.source_conversation_ref || input.sourceConversationRef)
        return null;
    const keys = ["source_channel", "target_scope", "target_id", "client_message_id", "content_checksum", "workflow_type"];
    const matching = tasks.filter(task => !task.task_session_boundary_version && task.automation_session_binding_snapshot
        && task.intake_identity?.schema === "ccm-task-intake-identity-v2"
        && keys.every(key => task.intake_identity[key] === identity[key]));
    if (matching.length > 1)
        throw Object.assign(new Error("历史自动化提交存在身份冲突，需人工对账"), { code: "TASK_INTAKE_LEGACY_CONFLICT", status: 409 });
    return matching[0] || null;
}
//# sourceMappingURL=task-intake-legacy-replay.js.map