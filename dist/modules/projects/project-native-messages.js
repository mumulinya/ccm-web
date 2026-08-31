"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProjectMainSessionGuidance = exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = void 0;
exports.tryBuildProjectNativeMainMessages = tryBuildProjectNativeMainMessages;
const native_session_transcript_1 = require("../../agents/native-session-transcript");
const native_query_messages_1 = require("../../agents/native-query-messages");
const transient_model_content_1 = require("../../system/transient-model-content");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const project_session_compaction_1 = require("./project-session-compaction");
const main_agent_identity_1 = require("../../agents/main-agent-identity");
Object.defineProperty(exports, "PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE", { enumerable: true, get: function () { return main_agent_identity_1.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE; } });
Object.defineProperty(exports, "buildProjectMainSessionGuidance", { enumerable: true, get: function () { return main_agent_identity_1.buildProjectMainSessionGuidance; } });
const session_model_context_1 = require("../../system/session-model-context");
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
    const conversation = (0, project_session_compaction_1.listProjectSessionHistoryMessages)(project, projectSessionId)
        .filter((item) => ["user", "assistant"].includes(String(item?.role || "")))
        .filter((item) => !visibleIds.size || visibleIds.has(item.id) || visibleIds.has(item.uuid));
    const history = (0, native_session_transcript_1.materializeNativeSessionTranscript)({
        family: (0, native_query_messages_1.nativeQueryFamily)(config),
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
    });
    return (0, transient_model_content_1.attachTransientModelBlocks)([...system, ...history], (0, transient_model_content_1.collectTransientModelBlocks)(input.toolResults || []));
}
//# sourceMappingURL=project-native-messages.js.map