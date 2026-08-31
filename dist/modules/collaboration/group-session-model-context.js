"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChildParentSessionContextPacket = exports.buildChildParentSessionContextProjection = void 0;
exports.buildExactGroupSessionModelContextProjection = buildExactGroupSessionModelContextProjection;
exports.buildExactGroupSessionModelContextPacket = buildExactGroupSessionModelContextPacket;
const session_model_context_1 = require("../../system/session-model-context");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const storage_1 = require("./storage");
const group_session_execution_ledger_1 = require("./group-session-execution-ledger");
const session_task_timeline_1 = require("../../tasks/session-task-timeline");
function modelContextMessageContent(message) {
    const value = message?.content ?? message?.message?.content ?? message?.text ?? "";
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value || "");
    }
}
function buildExactGroupSessionModelContextProjection(messagesInput, memory, options = {}) {
    const groupId = String(options.groupId || options.group_id || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "");
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_model_context");
    const messages = (Array.isArray(messagesInput) ? messagesInput : [])
        .filter((message) => !String(message?.content || "").startsWith("📤"));
    const summarySource = memory?.unifiedSessionSummary ? "model" : String(memory?.compaction?.summarySource || memory?.compaction?.summary_source || "").toLowerCase();
    const canonicalSummary = !!memory?.unifiedSessionSummary || (["model", "session-memory", "session_memory"].includes(summarySource) && !!memory?.conversationSummary);
    const boundaryIndex = memory?.unifiedSessionCompaction
        ? Math.max(-1, Number(memory.unifiedSessionCompaction.summarizedMessageCount || 0) - 1)
        : canonicalSummary ? (0, group_memory_shared_1.getCompactBoundaryIndex)(memory, messages) : -1;
    const sessionTaskIndex = (0, session_task_timeline_1.readVerifiedSessionTaskIndex)({ exactSessionId: groupSessionId, scope: "group", scopeId: groupId });
    const unified = (0, session_model_context_1.buildUnifiedSessionModelContextProjection)({
        scope: "group",
        scopeId: `${groupId}::${groupSessionId}`,
        sessionId: groupSessionId,
        messages,
        canonicalSummary: canonicalSummary ? (memory.unifiedSessionSummary || memory.conversationSummary) : null,
        summarySource: canonicalSummary ? summarySource : "",
        summaryChecksum: String(memory?.unifiedSessionCompaction?.summaryChecksum || memory?.compaction?.summaryChecksum || memory?.compactBoundary?.summaryChecksum || ""),
        boundaryGeneration: Number(memory?.unifiedSessionCompaction?.boundaryGeneration || memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0),
        summarizedThroughIndex: boundaryIndex,
        lastSummarizedMessageId: String(memory?.sessionMemory?.lastSummarizedMessageId
            || memory?.sessionMemory?.last_summarized_message_id
            || memory?.compaction?.sessionMemoryState?.lastExtractedMessageId
            || ""),
        partialCompaction: memory?.unifiedSessionCompaction?.partialCompaction || memory?.unifiedSessionBoundary?.partialCompaction || null,
        executionEvents: options.executionEvents || options.execution_events || (0, group_session_execution_ledger_1.listGroupSessionExecutionEvents)(groupId, groupSessionId),
        currentTaskId: sessionTaskIndex.activeTaskId,
        sessionTaskIndex,
        consumeSessionStartHookContext: options.consumeSessionStartHookContext === true,
    });
    return {
        ...unified,
        schema: "ccm-exact-group-session-model-context-v1",
        version: 1,
        groupId,
        groupSessionId,
        totalMessageCount: messages.length,
        visibleMessageCount: unified.visibleMessages.length,
        visibleMessageIds: unified.visibleMessages.filter((message) => message?.hidden_execution !== true).map((message) => message.id),
    };
}
function buildExactGroupSessionModelContextPacket(groupId, options = {}) {
    const id = String(groupId || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!id || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_model_context");
    return buildExactGroupSessionModelContextProjection((0, storage_1.getGroupMessages)(id, groupSessionId), (0, group_memory_storage_1.loadGroupMemory)(id, groupSessionId), {
        groupId: id,
        groupSessionId,
        consumeSessionStartHookContext: options.consumeSessionStartHookContext !== false,
        attempt: options.attempt,
    });
}
exports.buildChildParentSessionContextProjection = buildExactGroupSessionModelContextProjection;
exports.buildChildParentSessionContextPacket = buildExactGroupSessionModelContextPacket;
//# sourceMappingURL=group-session-model-context.js.map