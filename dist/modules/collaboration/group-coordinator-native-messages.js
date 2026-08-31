"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryBuildGroupNativeCoordinatorMessages = tryBuildGroupNativeCoordinatorMessages;
const native_session_transcript_1 = require("../../agents/native-session-transcript");
const native_query_messages_1 = require("../../agents/native-query-messages");
const transient_model_content_1 = require("../../system/transient-model-content");
const group_orchestrator_config_1 = require("./group-orchestrator-config");
const group_session_model_context_1 = require("./group-session-model-context");
const group_session_execution_ledger_1 = require("./group-session-execution-ledger");
const storage_1 = require("./storage");
const session_model_context_1 = require("../../system/session-model-context");
function tryBuildGroupNativeCoordinatorMessages(input) {
    const groupId = String(input.group?.id || "").trim();
    const groupSessionId = String(input.groupSessionId || "").trim();
    const config = input.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!groupId || !(0, native_session_transcript_1.shouldMaterializeNativeSessionTranscript)(config, groupSessionId) || !groupSessionId.startsWith("gcs_"))
        return null;
    let projection = null;
    try {
        projection = (0, group_session_model_context_1.buildExactGroupSessionModelContextPacket)(groupId, { groupSessionId });
    }
    catch {
        return null;
    }
    const visibleIds = new Set((projection.visibleMessageIds || []).filter(Boolean));
    const conversation = (0, storage_1.getGroupMessages)(groupId, groupSessionId)
        .filter((item) => !String(item?.content || "").startsWith("📤"))
        .filter((item) => !visibleIds.size || visibleIds.has(item.id) || visibleIds.has(item.uuid));
    const family = (0, native_query_messages_1.nativeQueryFamily)(config);
    // Persistent shared files and knowledge are catalog capabilities. The
    // 本地知识库参考 and 群聊共享文件 labels remain metadata-only until a
    // corresponding read tool puts their body into the native transcript.
    // bodies enter the transcript only through the corresponding read tool.
    const metaBlocks = [];
    const presentedPlan = [...conversation].reverse().find((item) => item?.presentedPlan || item?.presented_plan)?.presentedPlan
        || [...conversation].reverse().find((item) => item?.presentedPlan || item?.presented_plan)?.presented_plan
        || null;
    const history = (0, native_session_transcript_1.materializeNativeSessionTranscript)({
        family,
        conversation,
        executionEvents: (0, group_session_execution_ledger_1.listGroupSessionExecutionEvents)(groupId, groupSessionId),
        canonicalSummary: projection.canonicalSummary ? projection.summary : null,
        canonicalSummaryPlacement: projection?.partialCompaction?.summaryPlacement === "after_preserved" ? "after_message" : projection?.partialCompaction ? "before_conversation" : "after_conversation",
        canonicalSummaryAfterMessageId: projection?.partialCompaction?.summaryPlacement === "after_preserved" ? String(projection.partialCompaction.preservedMessageIds?.at(-1) || "") : "",
        metaBlocks,
        presentedPlan,
        currentUserText: String(input.message || "").trim(),
        clearedToolCallIds: projection.microCompact?.clearedToolCallIds,
        replacedToolResults: (0, session_model_context_1.sessionModelReplacementTextMap)(projection.contentReplacement),
        persistContext: { scope: "group", scopeId: groupId, sessionId: groupSessionId },
    });
    if ((0, native_session_transcript_1.lastNativeUserText)(history) !== String(input.message || "").trim())
        return null;
    const system = (0, native_session_transcript_1.splitNativeSystemSegments)({
        identityRules: input.identityRules,
        sessionGuidance: input.sessionGuidance,
        mcpPolicy: input.mcpPolicy,
    });
    return (0, transient_model_content_1.attachTransientModelBlocks)([...system, ...history], (0, transient_model_content_1.collectTransientModelBlocks)(input.mainAgentToolResults || []));
}
//# sourceMappingURL=group-coordinator-native-messages.js.map