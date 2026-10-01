"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProjectMainSessionGuidance = exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = void 0;
exports.tryBuildProjectNativeMainMessages = tryBuildProjectNativeMainMessages;
const native_session_transcript_1 = require("../../agents/native-session-transcript");
const session_model_checkpoint_1 = require("../../agents/session-model-checkpoint");
const native_query_messages_1 = require("../../agents/native-query-messages");
const transient_model_content_1 = require("../../system/transient-model-content");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const project_session_compaction_1 = require("./project-session-compaction");
const main_agent_identity_1 = require("../../agents/main-agent-identity");
Object.defineProperty(exports, "PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE", { enumerable: true, get: function () { return main_agent_identity_1.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE; } });
Object.defineProperty(exports, "buildProjectMainSessionGuidance", { enumerable: true, get: function () { return main_agent_identity_1.buildProjectMainSessionGuidance; } });
const session_model_context_1 = require("../../system/session-model-context");
const provider_cache_message_layout_1 = require("../../system/provider-cache-message-layout");
function tryBuildProjectNativeMainMessages(input) {
    const project = String(input.project || "").trim();
    const projectSessionId = String(input.projectSessionId || "").trim();
    const config = input.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!project || !(0, native_session_transcript_1.shouldMaterializeNativeSessionTranscript)(config, projectSessionId))
        return null;
    let projection = null;
    try {
        projection = (0, project_session_compaction_1.buildProjectSessionModelContextProjection)(project, projectSessionId, {
            currentRequest: input.userMessage,
        });
    }
    catch {
        projection = null;
    }
    const visibleIds = new Set((projection?.visibleMessages || []).map((item) => item?.id).filter(Boolean));
    const storedConversation = (0, project_session_compaction_1.listProjectSessionHistoryMessages)(project, projectSessionId)
        .filter((item) => ["user", "assistant"].includes(String(item?.role || "")));
    // The projection excludes the pending request to avoid sending it twice.
    // Keep its identity in the checkpoint source; the shared materializer already
    // appends its body exactly once. Otherwise it becomes an unexpected extra
    // history row on the next turn, or its later deletion cannot be detected.
    const pending = storedConversation.at(-1);
    const conversation = storedConversation.filter((item) => !visibleIds.size || visibleIds.has(item.id) || visibleIds.has(item.uuid)
        || (item === pending && item.role === 'user' && String(item.content || '').trim() === String(input.userMessage || '').trim()
            && item.modelVisible !== false && item.model_visible !== false));
    const history = (0, native_session_transcript_1.materializeNativeSessionTranscript)({
        family: (0, native_session_transcript_1.sessionTranscriptFamily)(config),
        protocolFamily: (0, native_query_messages_1.nativeQueryFamily)(config),
        conversation,
        executionEvents: (0, project_session_compaction_1.listProjectSessionExecutionEvents)(project, projectSessionId),
        canonicalSummary: projection?.canonicalSummary ? projection.summary : null,
        canonicalSummaryPlacement: projection?.partialCompaction?.summaryPlacement === "after_preserved" ? "after_message" : projection?.partialCompaction ? "before_conversation" : "after_conversation",
        canonicalSummaryAfterMessageId: projection?.partialCompaction?.summaryPlacement === "after_preserved" ? String(projection.partialCompaction.preservedMessageIds?.at(-1) || "") : "",
        metaBlocks: input.metaBlocks || [],
        currentUserText: String(input.userMessage || "").trim(),
        clearedToolCallIds: projection?.microCompact?.clearedToolCallIds,
        replacedToolResults: (0, session_model_context_1.sessionModelReplacementTextMap)(projection?.contentReplacement),
        persistContext: { scope: "project", scopeId: project, sessionId: projectSessionId },
    });
    if ((0, native_session_transcript_1.lastNativeUserText)(history) !== String(input.userMessage || "").trim())
        return null;
    const system = (0, native_session_transcript_1.splitNativeSystemSegments)({
        identityRules: input.identityRules,
        sessionGuidance: input.sessionGuidance,
        mcpPolicy: input.mcpPolicy,
        toolPromptLayout: input.toolPromptLayout,
    });
    return (0, session_model_checkpoint_1.transferModelReplaySource)((0, transient_model_content_1.attachTransientModelBlocks)((0, provider_cache_message_layout_1.composeNativeMessagesWithDynamicBoundary)(system, history), (0, transient_model_content_1.collectTransientModelBlocks)(input.toolResults || [])), history);
}
//# sourceMappingURL=project-native-messages.js.map